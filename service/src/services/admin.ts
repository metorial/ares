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
import { db } from '../db';
import { getId } from '../id';
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
    } else if (!admin) throw err;

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
}

export let adminService = Service.create('AdminService', () => new AdminServiceImpl()).build();
