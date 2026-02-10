import { idAdminService } from '@metorial-enterprise/federation-id';
import { v } from '@metorial/validation';
import { publicApp } from '../middleware/admin';

export let authenticationController = publicApp.controller({
  boot: publicApp.handler().do(() => idAdminService.getAdminAuthBoot()),

  login: publicApp
    .handler()
    .input(
      v.object({
        email: v.string(),
        password: v.string()
      })
    )
    .do(async ({ input, setCookie, context }) => {
      let session = await idAdminService.adminLogin({
        context,
        email: input.email,
        credentials: { type: 'password', password: input.password }
      });

      setCookie('metorial_admin_session', session.clientSecret, {
        path: '/',
        expires: new Date(session.expiresAt),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });

      return {};
    })
});
