import {
  badRequestError,
  notFoundError,
  ServiceError,
  unauthorizedError
} from '@lowerdeck/error';
import { generatePlainId } from '@lowerdeck/id';
import { Paginator } from '@lowerdeck/pagination';
import { Service } from '@lowerdeck/service';
import { addHours } from 'date-fns';
import type { Admin, App, User } from '../../prisma/generated/client';
import { db, withTransaction } from '../db';
import { getId, ID } from '../id';
import type { Context } from '../lib/context';

class AdminServiceImpl {
  async createAdminSession(d: { admin: Admin; context: Context }) {
    return await db.adminSession.create({
      data: {
        ...getId('adminSession'),
        clientSecret: generatePlainId(50),
        adminOid: d.admin.oid,
        expiresAt: addHours(new Date(), 1),
        ip: d.context.ip,
        ua: d.context.ua
      }
    });
  }

  async listUsers(d: { app: App; search?: string }) {
    return Paginator.create(({ prisma }) =>
      prisma(
        async opts =>
          await db.user.findMany({
            ...opts,
            where: {
              appOid: d.app.oid,
              OR: d.search
                ? [
                    { userEmails: { some: { email: { contains: d.search } } } },
                    { name: { contains: d.search } },
                    { firstName: { contains: d.search } },
                    { lastName: { contains: d.search } }
                  ]
                : undefined
            },
            include: { userEmails: true }
          })
      )
    );
  }

  async getUser(d: { userId: string }) {
    let user = await db.user.findUnique({
      where: { id: d.userId },
      include: {
        userEmails: true,
        authDeviceUserSessions: {
          include: { device: true }
        },
        authAttempts: true
      }
    });
    if (!user) throw new ServiceError(notFoundError('user', d.userId));
    return user;
  }

  async impersonateUser(d: { user: User; password?: string; admin: Admin; reason: string }) {
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
        userOid: d.user.oid,
        adminOid: d.admin.oid,
        reason: d.reason,
        expiresAt: addHours(new Date(), 1)
      }
    });
  }

  async listAdmins() {
    return Paginator.create(({ prisma }) =>
      prisma(
        async opts =>
          await db.admin.findMany({
            ...opts
          })
      )
    );
  }

  async authenticateAdmin(d: { clientSecret: string }) {
    let session = await db.adminSession.findUnique({
      where: { clientSecret: d.clientSecret },
      include: { admin: true }
    });
    if (!session || session.expiresAt < new Date()) {
      throw new ServiceError(unauthorizedError({ message: 'Invalid session' }));
    }

    return session.admin;
  }

  async createApp(d: {
    defaultRedirectUrl: string;
    slug?: string;
    redirectDomains?: string[];
  }) {
    return withTransaction(async db => {
      let app = await db.app.create({
        data: {
          ...getId('app'),
          clientId: await ID.generateId('app_clientId'),
          slug: d.slug || null,
          defaultRedirectUrl: d.defaultRedirectUrl,
          redirectDomains: d.redirectDomains ?? []
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

  async upsertApp(d: {
    defaultRedirectUrl: string;
    slug: string;
    redirectDomains?: string[];
  }) {
    let existingApp = await db.app.findUnique({
      where: { slug: d.slug },
      include: {
        defaultTenant: true,
        _count: { select: { users: true, tenants: true } }
      }
    });
    try {
      return await this.createApp({
        defaultRedirectUrl: d.defaultRedirectUrl,
        slug: d.slug,
        redirectDomains: d.redirectDomains
      });
    } catch (e: any) {
      if (e.code !== 'P2002') {
        throw e;
      }

      existingApp = await db.app.findUnique({
        where: { slug: d.slug },
        include: {
          defaultTenant: true,
          _count: { select: { users: true, tenants: true } }
        }
      });
      if (!existingApp) throw e;
    }

    return await this.updateApp({
      app: existingApp,
      input: { redirectDomains: d.redirectDomains, slug: d.slug }
    });
  }

  async updateApp(d: { app: App; input: { slug?: string; redirectDomains?: string[] } }) {
    return await db.app.update({
      where: { oid: d.app.oid },
      data: {
        slug: d.input.slug !== undefined ? d.input.slug || null : undefined,
        redirectDomains:
          d.input.redirectDomains !== undefined ? d.input.redirectDomains : undefined
      },
      include: {
        defaultTenant: true,
        _count: { select: { users: true, tenants: true } }
      }
    });
  }

  async listApps() {
    return Paginator.create(({ prisma }) =>
      prisma(
        async opts =>
          await db.app.findMany({
            ...opts,
            include: {
              defaultTenant: true,
              _count: { select: { users: true, tenants: true } }
            }
          })
      )
    );
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
    if (!app) throw new ServiceError(notFoundError('app', d.appId));
    return app;
  }

  async listTenants(d: { app: App }) {
    return Paginator.create(({ prisma }) =>
      prisma(
        async opts =>
          await db.tenant.findMany({
            ...opts,
            where: { appOid: d.app.oid },
            include: {
              _count: { select: { users: true } }
            }
          })
      )
    );
  }

  async getTenant(d: { tenantId: string }) {
    let tenant = await db.tenant.findUnique({
      where: { id: d.tenantId },
      include: {
        app: true,
        _count: { select: { users: true } }
      }
    });
    if (!tenant) throw new ServiceError(notFoundError('tenant', d.tenantId));
    return tenant;
  }
}

export let adminService = Service.create('AdminService', () => new AdminServiceImpl()).build();
