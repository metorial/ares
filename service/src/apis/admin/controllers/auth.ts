import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { ADMIN_SESSION_COOKIE_NAME, publicApp } from '../middleware/admin';

export let authenticationController = publicApp.controller({
  login: publicApp
    .handler()
    .input(
      v.object({
        email: v.string(),
        password: v.string()
      })
    )
    .do(async ({ input, setCookie, context }) => {
      let session = await adminService.adminLogin({
        email: input.email,
        password: input.password,
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
