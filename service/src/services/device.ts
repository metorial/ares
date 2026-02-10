import { ServiceError, unauthorizedError } from '@lowerdeck/error';
import { addWeeks } from 'date-fns';
import type {
  AuthAttempt,
  AuthDevice,
  AuthDeviceUserSession,
  User
} from '../../prisma/generated/client';
import { db, withTransaction } from '../db';
import { getId, snowflake } from '../id';
import type { Context } from '../lib/context';

class DeviceService {
  async getAllUsersForDevice(i: { device: AuthDevice }) {
    return await db.authDeviceUserSession.findMany({
      where: {
        deviceOid: i.device.oid
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
    return await db.authDeviceUserSession.findMany({
      where: {
        deviceOid: i.device.oid,
        loggedOutAt: null,
        expiresAt: { gte: new Date() },
        impersonationOid: null
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
    let sessions = await db.authDeviceUserSession.findMany({
      where: {
        deviceOid: i.device.oid,
        impersonationOid: null
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

    let loggedInUserIds = new Set(loggedInSessions.map(s => s.userOid));
    let seenUserIds = new Set();

    let loggedOutSessionsUnique = loggedOutSessions.filter(s => {
      if (seenUserIds.has(s.userOid)) return false;
      seenUserIds.add(s.userOid);
      return !loggedInUserIds.has(s.userOid);
    });

    return [...loggedInSessions, ...loggedOutSessionsUnique];
  }

  async getSessionForLoggedInUser(i: { user: User; device: AuthDevice }) {
    return await db.authDeviceUserSession.findFirst({
      where: {
        userOid: i.user.oid,
        deviceOid: i.device.oid,
        loggedOutAt: null,
        expiresAt: { gte: new Date() },
        impersonationOid: null
      },
      include: {
        user: true
      }
    });
  }

  async checkIfUserIsLoggedIn(i: { user: User; device: AuthDevice }) {
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
          where: { oid: i.authAttempt.deviceOid }
        }),
        db.user.findUnique({
          where: { oid: i.authAttempt.userOid }
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
        await db.user.updateMany({
          where: { oid: user!.oid },
          data: { lastLoginAt: new Date() }
        });
      }

      return await db.authDeviceUserSession.create({
        data: {
          ...getId('authDeviceUserSession'),
          userOid: user!.oid,
          deviceOid: device!.oid,
          appOid: user!.appOid,
          expiresAt: impersonation?.expiresAt ?? addWeeks(new Date(), 2),
          impersonationOid: impersonation?.oid ?? null
        }
      });
    });
  }

  async getDeviceSafe(i: { deviceId: string; deviceClientSecret: string }) {
    return await db.authDevice.findFirst({
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
    let device = await db.authDevice.findFirst({
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

  async listUserSessions(i: { user: User }) {
    let sessions = await db.authDeviceUserSession.findMany({
      where: {
        userOid: i.user.oid,
        impersonationOid: null
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
    return await db.authDevice.create({
      data: {
        ...getId('authDevice'),
        clientSecret: getId('authDevice').id,

        ip: i.context.ip,
        ua: i.context.ua,

        lastIp: i.context.ip,
        lastUa: i.context.ua,

        history: {
          create: {
            id: snowflake.nextId(),
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
    if (i.session?.impersonationOid) return false;

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
      await db.authDevice.updateMany({
        where: { id: i.device.id },
        data: {
          lastIp: i.context.ip,
          lastUa: i.context.ua,
          lastActiveAt: new Date()
        }
      });

      if (updateHistory) {
        await db.authDeviceHistory.create({
          data: {
            id: snowflake.nextId(),
            deviceOid: i.device.oid,
            ip: i.context.ip,
            ua: i.context.ua
          }
        });
      }

      if (i.session) {
        if (bumpSession) {
          await db.authDeviceUserSession.updateMany({
            where: { id: i.session.id },
            data: { expiresAt: addWeeks(new Date(), 2) }
          });
        }

        if (updateSessionLastActiveAt) {
          await db.user.updateMany({
            where: { oid: i.session.userOid },
            data: { lastActiveAt: new Date() }
          });

          await db.authDeviceUserSession.update({
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
