import {
  badRequestError,
  notFoundError,
  ServiceError,
  unauthorizedError
} from '@lowerdeck/error';
import { generatePlainId } from '@lowerdeck/id';
import { Service } from '@lowerdeck/service';
import { addHours } from 'date-fns';
import type { Admin, App } from '../../prisma/generated/client';
import { db, withTransaction } from '../db';
import { getId, ID } from '../id';
import type { Context } from '../lib/context';
import { authBlockService } from './authBlock';

class AdminServiceImpl {
  async adminLogin(d: { email: string; password: string; context: Context }) {
    await authBlockService.registerBlock({ email: d.email, context: d.context });

    let admin = await db.admin.findUnique({
      where: {
        email: d.email
      }
    });

    let err = new ServiceError(
      unauthorizedError({
        message: 'Invalid email or password'
      })
    );

    // Skip password check in development for easier testing
    if (process.env.NODE_ENV != 'development') {
      if (!admin) throw err;
      let valid = await Bun.password.verify(d.password, admin.password);
      if (!valid) throw err;
    } else if (!admin) {
      admin = await db.admin.create({
        data: {
          ...getId('admin'),
          email: d.email,
          name: d.email.split('@')[0]!,
          password: ''
        }
      });
    }

    return await db.adminSession.create({
      data: {
        ...getId('adminSession'),
        clientSecret: generatePlainId(50),
        adminOid: admin.oid,
        expiresAt: addHours(new Date(), 1),
        ip: d.context.ip,
        ua: d.context.ua
      }
    });
  }

  async adminLoginWithOAuth(d: { email: string; name: string; context: Context }) {
    let admin = await db.admin.upsert({
      where: { email: d.email },
      create: {
        ...getId('admin'),
        email: d.email,
        name: d.name,
        password: ''
      },
      update: {}
    });

    return await db.adminSession.create({
      data: {
        ...getId('adminSession'),
        clientSecret: generatePlainId(50),
        adminOid: admin.oid,
        expiresAt: addHours(new Date(), 1),
        ip: d.context.ip,
        ua: d.context.ua
      }
    });
  }

  async listUsers(d: { app: App; after?: string; search?: string }) {
    return await db.user.findMany({
      where: {
        appOid: d.app.oid,
        OR: d.search
          ? [
              { userEmails: { some: { email: { contains: d.search } } } },
              { name: { contains: d.search } },
              { firstName: { contains: d.search } },
              { lastName: { contains: d.search } }
            ]
          : undefined,

        id: d.after ? { gt: d.after } : undefined
      },
      take: 100,
      orderBy: { id: 'asc' }
    });
  }

  async getUser(d: { userId: string }) {
    let user = await db.user.findUnique({
      where: { id: d.userId },
      include: {
        userEmails: true,
        authDeviceUserSessions: {
          include: {
            device: true
          }
        },
        authAttempts: true
      }
    });
    if (!user) {
      throw new ServiceError(notFoundError('user', d.userId));
    }

    return user;
  }

  async impersonateUser(d: {
    userId: string;
    password?: string;
    admin: Admin;
    reason: string;
  }) {
    let user = await this.getUser({ userId: d.userId });

    // BE VERY CAREFUL WITH THIS
    if (process.env.NODE_ENV != 'development') {
      if (d.admin.password.length) {
        if (!d.password) {
          throw new ServiceError(badRequestError({ message: 'Password is required' }));
        }

        let valid = await Bun.password.verify(d.password!, d.admin.password);
        if (!valid) {
          throw new ServiceError(badRequestError({ message: 'Invalid password' }));
        }
      }
    }

    return await db.userImpersonation.create({
      data: {
        ...getId('userImpersonation'),
        clientSecret: generatePlainId(50),
        userOid: user.oid,
        adminOid: d.admin.oid,
        reason: d.reason,
        expiresAt: addHours(new Date(), 1)
      }
    });
  }

  async listAdmins(d: { after?: string; search?: string }) {
    return await db.admin.findMany({
      where: {
        OR: d.search
          ? [{ name: { contains: d.search } }, { email: { contains: d.search } }]
          : undefined,

        id: d.after ? { gt: d.after } : undefined
      },
      take: 25,
      orderBy: { id: 'asc' }
    });
  }

  async authenticateAdmin(d: { clientSecret: string }) {
    let session = await db.adminSession.findUnique({
      where: { clientSecret: d.clientSecret },
      include: {
        admin: true
      }
    });
    if (!session || session.expiresAt < new Date()) {
      throw new ServiceError(unauthorizedError({ message: 'Invalid session' }));
    }

    return session.admin;
  }

  async createApp(d: { defaultRedirectUrl: string; slug?: string }) {
    return withTransaction(async db => {
      let app = await db.app.create({
        data: {
          ...getId('app'),
          clientId: await ID.generateId('app_clientId'),
          slug: d.slug || null,
          defaultRedirectUrl: d.defaultRedirectUrl
        }
      });

      let tenant = await db.tenant.create({
        data: {
          ...getId('tenant'),
          clientId: await ID.generateId('tenant_clientId'),
          appOid: app.oid
        }
      });

      return await db.app.update({
        where: { oid: app.oid },
        data: { defaultTenantOid: tenant.oid },
        include: {
          defaultTenant: true,
          _count: { select: { users: true, tenants: true } }
        }
      });
    });
  }

  async updateApp(d: { appId: string; slug?: string }) {
    let app = await this.getApp({ appId: d.appId });

    return await db.app.update({
      where: { oid: app.oid },
      data: {
        slug: d.slug !== undefined ? d.slug || null : undefined
      },
      include: {
        defaultTenant: true,
        _count: { select: { users: true, tenants: true } }
      }
    });
  }

  async listApps(d: { after?: string; search?: string }) {
    return await db.app.findMany({
      where: {
        OR: d.search ? [{ clientId: { contains: d.search } }] : undefined,
        id: d.after ? { gt: d.after } : undefined
      },
      include: {
        defaultTenant: true,
        _count: { select: { users: true, tenants: true } }
      },
      take: 50,
      orderBy: { id: 'asc' }
    });
  }

  async getApp(d: { appId: string }) {
    let app = await db.app.findUnique({
      where: { id: d.appId },
      include: {
        defaultTenant: true,
        tenants: true,
        _count: { select: { users: true } }
      }
    });
    if (!app) {
      throw new ServiceError(notFoundError('app', d.appId));
    }

    return app;
  }

  async listTenants(d: { appId: string; after?: string; search?: string }) {
    let app = await this.getApp({ appId: d.appId });

    return await db.tenant.findMany({
      where: {
        appOid: app.oid,
        OR: d.search ? [{ clientId: { contains: d.search } }] : undefined,
        id: d.after ? { gt: d.after } : undefined
      },
      include: {
        _count: { select: { users: true } }
      },
      take: 50,
      orderBy: { id: 'asc' }
    });
  }

  async getTenant(d: { tenantId: string }) {
    let tenant = await db.tenant.findUnique({
      where: { id: d.tenantId },
      include: {
        app: true,
        _count: { select: { users: true } }
      }
    });
    if (!tenant) {
      throw new ServiceError(notFoundError('tenant', d.tenantId));
    }

    return tenant;
  }
}

export let adminService = Service.create('AdminService', () => new AdminServiceImpl()).build();
