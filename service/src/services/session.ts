import {
  AuthDeviceUserSession,
  EnterpriseUser,
  federationDB,
  FederationID
} from '@metorial-enterprise/federation-data';
import { createCachedFunction } from '@metorial/cache';
import { Context } from '@metorial/context';
import { notFoundError, ServiceError } from '@metorial/error';
import { Service } from '@metorial/service';
import { deviceService } from './device';

let cacheTTLSecs = 60 * 5;
let findAuthSessionCached = createCachedFunction({
  name: 'authenticate',
  provider: async (i: { sessionId: string }, { setTTL }) => {
    let session = await federationDB.authDeviceUserSession.findUnique({
      where: {
        id: i.sessionId,
        loggedOutAt: null,
        expiresAt: { gte: new Date() }
      },
      include: {
        device: true,
        user: {
          include: { emails: true }
        }
      }
    });

    let user = session?.user;
    let device = session?.device;
    if (!session || !device || !user) return null;

    if (!user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 1000 * 60 * 30) {
      user = await federationDB.enterpriseUser.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
        include: { emails: true }
      });
    }

    return { device, session, user };
  },
  getHash: i => `1:${i.sessionId}`,
  getTags: o => (o ? [o.user.id] : []),
  ttlSeconds: cacheTTLSecs
});

class SessionService {
  async clearCache(user: EnterpriseUser) {
    return findAuthSessionCached.clearByTag(user.id);
  }

  async authenticate(i: {
    deviceId: string;
    deviceClientSecret: string;
    sessionId: string;
    context: Context;
  }) {
    let res = await findAuthSessionCached(i);

    if (
      !res ||
      res.device.id != i.deviceId ||
      res.device.clientSecret != i.deviceClientSecret ||
      res.session.expiresAt < new Date()
    )
      return null;

    let changed = await deviceService.recordDeviceUse({
      context: i.context,
      device: res.device,
      session: res.session
    });
    if (changed) findAuthSessionCached.clear(i);

    return res;
  }

  async logout(i: { session: AuthDeviceUserSession }) {
    let res = await federationDB.authDeviceUserSession.update({
      where: {
        id: i.session.id
      },
      data: {
        loggedOutAt: new Date(),
        expiresAt: new Date()
      },
      include: { device: true }
    });

    await findAuthSessionCached.clear({
      sessionId: i.session.id
    });

    return res;
  }

  async getSessionSafe(i: { sessionId: string }) {
    return federationDB.authDeviceUserSession.findUnique({
      where: { id: i.sessionId },
      include: { device: true, user: true }
    });
  }

  async getUserSession(i: { user: EnterpriseUser; sessionId: string }) {
    let session = await federationDB.authDeviceUserSession.findUnique({
      where: { id: i.sessionId, userId: i.user.id },
      include: { device: true, user: true }
    });
    if (!session) throw new ServiceError(notFoundError('session', i.sessionId));

    return session;
  }

  async getImpersonationSession(i: { session: AuthDeviceUserSession }) {
    let ses = await federationDB.authDeviceUserSession.findUnique({
      where: { id: i.session.id },
      include: { impersonation: { include: { admin: true } } }
    });

    return ses?.impersonation;
  }

  async findAdminForSession(i: { session: AuthDeviceUserSession & { user: EnterpriseUser } }) {
    let admin = await federationDB.admin.findUnique({
      where: { email: i.session.user.email }
    });
    return admin;
  }

  async upsertDevAdminSession(i: {
    session: AuthDeviceUserSession & { user: EnterpriseUser };
  }) {
    if (process.env.NODE_ENV != 'development') {
      throw new Error('NOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO');
    }

    let existingAdmin = await federationDB.admin.findUnique({
      where: { email: i.session.user.email }
    });
    if (existingAdmin) return existingAdmin;

    return await federationDB.admin.upsert({
      where: { email: i.session.user.email },
      create: {
        email: i.session.user.email,
        name: i.session.user.name,
        id: await FederationID.generateId('admin'),
        password: ''
      },
      update: {}
    });
  }
}

export let sessionService = Service.create(
  'SessionService',
  () => new SessionService()
).build();
