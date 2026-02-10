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
  async adminLogin(i: { email: string; password: string; context: Context }) {
    await authBlockService.registerBlock({ email: i.email, context: i.context });

    let admin = await db.admin.findUnique({
      where: {
        email: i.email
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

      let valid = await Bun.password.verify(i.password, admin.password);
      if (!valid) throw err;
    } else if (!admin) throw err;

    return await db.adminSession.create({
      data: {
        ...getId('adminSession'),
        clientSecret: generatePlainId(50),
        adminOid: admin.oid,
        expiresAt: addHours(new Date(), 1),
        ip: i.context.ip,
        ua: i.context.ua
      }
    });
  }

  async listUsers(i: { app: App; after?: string; search?: string }) {
    return await db.user.findMany({
      where: {
        appOid: i.app.oid,
        OR: i.search
          ? [
              { userEmails: { some: { email: { contains: i.search } } } },
              { name: { contains: i.search } },
              { firstName: { contains: i.search } },
              { lastName: { contains: i.search } }
            ]
          : undefined,

        id: i.after ? { gt: i.after } : undefined
      },
      take: 100,
      orderBy: { id: 'asc' }
    });
  }

  async getUser(i: { userId: string }) {
    let user = await db.user.findUnique({
      where: { id: i.userId },
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
      throw new ServiceError(notFoundError('user', i.userId));
    }

    return user;
  }

  async impersonateUser(i: {
    userId: string;
    password?: string;
    admin: Admin;
    reason: string;
  }) {
    let user = await this.getUser({ userId: i.userId });

    // BE VERY CAREFUL WITH THIS
    if (process.env.NODE_ENV != 'development') {
      if (i.admin.password.length) {
        if (!i.password) {
          throw new ServiceError(badRequestError({ message: 'Password is required' }));
        }

        let valid = await Bun.password.verify(i.password!, i.admin.password);
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
        adminOid: i.admin.oid,
        reason: i.reason,
        expiresAt: addHours(new Date(), 1)
      }
    });
  }

  async listAdmins(i: { after?: string; search?: string }) {
    return await db.admin.findMany({
      where: {
        OR: i.search
          ? [{ name: { contains: i.search } }, { email: { contains: i.search } }]
          : undefined,

        id: i.after ? { gt: i.after } : undefined
      },
      take: 25,
      orderBy: { id: 'asc' }
    });
  }

  async authenticateAdmin(i: { clientSecret: string }) {
    let session = await db.adminSession.findUnique({
      where: { clientSecret: i.clientSecret },
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
