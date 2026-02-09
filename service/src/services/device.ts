import {
  AuthAttempt,
  AuthDevice,
  AuthDeviceUserSession,
  EnterpriseUser,
  federationDB,
  FederationID,
  withTransaction
} from '@metorial-enterprise/federation-data';
import { Context } from '@metorial/context';
import { ServiceError, unauthorizedError } from '@metorial/error';
import { addWeeks } from 'date-fns';

class DeviceService {
  async getAllUsersForDevice(i: { device: AuthDevice }) {
    return await federationDB.authDeviceUserSession.findMany({
      where: {
        deviceId: i.device.id
      },
      include: {
        user: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  }

  async getLoggedInUsersForDevice(i: { device: AuthDevice }) {
    return await federationDB.authDeviceUserSession.findMany({
      where: {
        deviceId: i.device.id,
        loggedOutAt: null,
        expiresAt: { gte: new Date() },
        impersonationId: null
      },
      include: {
        user: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  }

  async isLoggedInSession(i: { session: AuthDeviceUserSession }) {
    // true if session is logged in
    return !i.session.loggedOutAt && i.session.expiresAt.getTime() > Date.now();
  }

  async getLoggedInAndLoggedOutUsersForDevice(i: { device: AuthDevice }) {
    let sessions = await federationDB.authDeviceUserSession.findMany({
      where: {
        deviceId: i.device.id,
        impersonationId: null
      },
      include: {
        user: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    let loggedInSessions = sessions.filter(s => !s.loggedOutAt && s.expiresAt > new Date());
    let loggedOutSessions = sessions.filter(s => s.loggedOutAt || s.expiresAt <= new Date());

    let loggedInUserIds = new Set(loggedInSessions.map(s => s.userId));
    let seenUserIds = new Set();

    let loggedOutSessionsUnique = loggedOutSessions.filter(s => {
      if (seenUserIds.has(s.userId)) return false;
      seenUserIds.add(s.userId);
      return !loggedInUserIds.has(s.userId);
    });

    return [...loggedInSessions, ...loggedOutSessionsUnique];
  }

  async getSessionForLoggedInUser(i: { user: EnterpriseUser; device: AuthDevice }) {
    return await federationDB.authDeviceUserSession.findFirst({
      where: {
        userId: i.user.id,
        deviceId: i.device.id,
        loggedOutAt: null,
        expiresAt: { gte: new Date() },
        impersonationId: null
      },
      include: {
        user: true
      }
    });
  }

  async checkIfUserIsLoggedIn(i: { user: EnterpriseUser; device: AuthDevice }) {
    let session = await this.getSessionForLoggedInUser(i);

    return !!session;
  }

  async exchangeAuthAttemptForSession(i: { authAttempt: AuthAttempt }) {
    return await withTransaction(async db => {
      let updateRes = await db.authAttempt.updateMany({
        where: { id: i.authAttempt.id, status: 'pending' },
        data: { status: 'consumed' }
      });
      if (updateRes.count != 1) {
        throw new ServiceError(unauthorizedError({ message: 'Invalid auth attempt' }));
      }

      let [device, user] = await Promise.all([
        db.authDevice.findUnique({
          where: { id: i.authAttempt.deviceId }
        }),
        db.enterpriseUser.findUnique({
          where: { id: i.authAttempt.userId }
        })
      ]);

      let existingSession = await this.getSessionForLoggedInUser({
        user: user!,
        device: device!
      });
      if (existingSession) return existingSession;

      let impersonation = i.authAttempt.userImpersonationId
        ? await db.userImpersonation.findUnique({
            where: { id: i.authAttempt.userImpersonationId }
          })
        : null;

      if (!impersonation) {
        await db.enterpriseUser.updateMany({
          where: { id: user!.id },
          data: { lastLoginAt: new Date() }
        });
      }

      return await db.authDeviceUserSession.create({
        data: {
          id: await FederationID.generateId('deviceUserSession'),
          userId: user!.id,
          deviceId: device!.id,
          expiresAt: impersonation?.expiresAt ?? addWeeks(new Date(), 2),
          impersonationId: impersonation?.id
        }
      });
    });
  }

  async getDeviceSafe(i: { deviceId: string; deviceClientSecret: string }) {
    return await federationDB.authDevice.findFirst({
      where: {
        id: i.deviceId,
        clientSecret: i.deviceClientSecret
      }
    });
  }

  async getDevice(i: { deviceId: string; deviceClientSecret: string }) {
    let device = await this.getDeviceSafe(i);
    if (!device) {
      throw new ServiceError(unauthorizedError({ message: 'Uninitialized device' }));
    }

    return device;
  }

  async useDevice(i: { deviceId: string; deviceClientSecret: string; context: Context }) {
    let device = await this.getDevice(i);
    await this.recordDeviceUse({
      device,
      context: i.context
    });
    return device;
  }

  async dangerouslyGetDeviceOnlyById(i: { deviceId: string }) {
    let device = await federationDB.authDevice.findFirst({
      where: { id: i.deviceId }
    });
    if (!device) {
      throw new ServiceError(unauthorizedError({ message: 'Uninitialized device' }));
    }

    return device;
  }

  async ensureDevice(i: { deviceId?: string; deviceClientSecret?: string; context: Context }) {
    let device =
      i.deviceClientSecret && i.deviceId
        ? await this.getDeviceSafe({
            deviceId: i.deviceId,
            deviceClientSecret: i.deviceClientSecret
          })
        : undefined;

    if (!device) {
      device = await this.createDevice({
        context: i.context
      });
    }

    await this.recordDeviceUse({
      device,
      context: i.context
    });
    return device;
  }

  async listUserSessions(i: { user: EnterpriseUser }) {
    let sessions = await federationDB.authDeviceUserSession.findMany({
      where: {
        userId: i.user.id,
        impersonationId: null
      },
      include: {
        device: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    return sessions;
  }

  async createDevice(i: { context: Context }) {
    return await federationDB.authDevice.create({
      data: {
        id: await FederationID.generateId('device'),
        clientSecret: await FederationID.generateId('deviceClientSecret'),

        ip: i.context.ip,
        ua: i.context.ua,

        lastIp: i.context.ip,
        lastUa: i.context.ua,

        history: {
          create: {
            ip: i.context.ip,
            ua: i.context.ua
          }
        }
      }
    });
  }

  async recordDeviceUse(i: {
    device: AuthDevice;
    context: Context;
    session?: AuthDeviceUserSession;
  }) {
    if (i.session?.impersonationId) return false;

    let updateHistory = false;
    let updateDeviceLastActiveAt = false;
    let updateSessionLastActiveAt = false;
    let bumpSession = false;

    if (
      !i.device.lastActiveAt ||
      Date.now() - i.device.lastActiveAt.getTime() > 1000 * 60 * 60
    ) {
      updateDeviceLastActiveAt = true;
    }

    if (i.device.lastIp != i.context.ip || i.device.lastUa != i.context.ua) {
      updateHistory = true;
    }

    if (i.session) {
      if (i.session.expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 5) {
        bumpSession = true;
      }

      if (
        !i.session.lastActiveAt ||
        Date.now() - i.session.lastActiveAt.getTime() > 1000 * 60 * 60
      ) {
        updateSessionLastActiveAt = true;
      }
    }

    if (
      bumpSession ||
      updateHistory ||
      updateDeviceLastActiveAt ||
      updateSessionLastActiveAt
    ) {
      await federationDB.authDevice.updateMany({
        where: { id: i.device.id },
        data: {
          lastIp: i.context.ip,
          lastUa: i.context.ua,
          lastActiveAt: new Date()
        }
      });

      if (updateHistory) {
        await federationDB.authDeviceHistory.create({
          data: {
            deviceId: i.device.id,
            ip: i.context.ip,
            ua: i.context.ua
          }
        });
      }

      if (i.session) {
        if (bumpSession) {
          await federationDB.authDeviceUserSession.updateMany({
            where: { id: i.session.id },
            data: { expiresAt: addWeeks(new Date(), 2) }
          });
        }

        if (updateSessionLastActiveAt) {
          await federationDB.enterpriseUser.updateMany({
            where: { id: i.session.userId },
            data: { lastActiveAt: new Date() }
          });

          await federationDB.authDeviceUserSession.update({
            where: { id: i.session.id },
            data: { lastActiveAt: new Date() }
          });
        }
      }

      return true;
    }

    return false;
  }
}

export let deviceService = new DeviceService();
