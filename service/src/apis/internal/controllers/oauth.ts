import { notFoundError, ServiceError } from '@lowerdeck/error';
import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { authService } from '../../../services/auth';
import { internalApp } from '../_app';

let resolveApp = async (clientId: string) => {
  let app = await db.app.findFirst({
    where: {
      OR: [{ clientId }, { slug: clientId }]
    }
  });
  if (!app) throw new ServiceError(notFoundError('app'));
  return app;
};

export let oauthController = internalApp.controller({
  exchange: internalApp
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
