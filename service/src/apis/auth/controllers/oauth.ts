import { v } from '@lowerdeck/validation';
import { authService } from '../../../services/auth';
import { resolveApp } from '../lib/resolveApp';
import { publicApp } from '../_app';

export let oauthController = publicApp.controller({
  exchange: publicApp
    .handler()
    .input(
      v.object({
        clientId: v.string(),
        authorizationCode: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await resolveApp(input.clientId);
      return await authService.exchangeAuthorizationCode({
        app,
        authorizationCode: input.authorizationCode
      });
    })
});
