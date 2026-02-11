import { ServiceError, unauthorizedError } from '@lowerdeck/error';
import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { getId } from '../../../id';
import { adminService } from '../../../services/admin';
import { authService } from '../../../services/auth';
import { ADMIN_SESSION_COOKIE_NAME, publicApp } from '../middleware/admin';

let ADMIN_APP_SLUG = '__admin__';

export let authenticationController = publicApp.controller({
  exchangeCode: publicApp
    .handler()
    .input(
      v.object({
        code: v.string()
      })
    )
    .do(async ({ input, setCookie, context }) => {
      let app = await db.app.findFirst({ where: { slug: ADMIN_APP_SLUG } });
      if (!app) {
        throw new ServiceError(unauthorizedError({ message: 'Admin app not configured' }));
      }

      let result = await authService.exchangeAuthorizationCode({
        app,
        authorizationCode: input.code
      });

      let admin = await db.admin.findUnique({
        where: { email: result.user.email }
      });

      if (!admin) {
        if (process.env.NODE_ENV === 'development') {
          admin = await db.admin.create({
            data: {
              ...getId('admin'),
              email: result.user.email,
              name: result.user.name || result.user.email.split('@')[0]!,
              password: ''
            }
          });
        } else {
          throw new ServiceError(unauthorizedError({ message: 'Unauthorized' }));
        }
      }

      let session = await adminService.createAdminSession({
        admin,
        context: {
          ip: context.ip,
          ua: context.ua ?? ''
        }
      });

      setCookie(ADMIN_SESSION_COOKIE_NAME, session.clientSecret, {
        path: '/',
        expires: new Date(session.expiresAt),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });

      return {};
    })
});
