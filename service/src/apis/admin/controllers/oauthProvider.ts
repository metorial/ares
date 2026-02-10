import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { getId } from '../../../id';
import { adminService } from '../../../services/admin';
import { adminApp } from '../middleware/admin';
import { oauthProviderPresenter } from '../presenters';

export let oauthProviderController = adminApp.controller({
  list: adminApp
    .handler()
    .input(
      v.object({
        appId: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });

      let providers = await db.appOAuthProvider.findMany({
        where: { appOid: app.oid },
        orderBy: { createdAt: 'desc' }
      });

      return providers.map(oauthProviderPresenter);
    }),

  create: adminApp
    .handler()
    .input(
      v.object({
        appId: v.string(),
        provider: v.enumOf(['github', 'google']),
        clientId: v.string(),
        clientSecret: v.string(),
        redirectUri: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });

      let provider = await db.appOAuthProvider.create({
        data: {
          ...getId('appOAuthProvider'),
          appOid: app.oid,
          provider: input.provider,
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          redirectUri: input.redirectUri
        }
      });

      return oauthProviderPresenter(provider);
    }),

  update: adminApp
    .handler()
    .input(
      v.object({
        id: v.string(),
        clientId: v.optional(v.string()),
        clientSecret: v.optional(v.string()),
        redirectUri: v.optional(v.string()),
        enabled: v.optional(v.boolean())
      })
    )
    .do(async ({ input }) => {
      let provider = await db.appOAuthProvider.update({
        where: { id: input.id },
        data: {
          clientId: input.clientId ?? undefined,
          clientSecret: input.clientSecret ?? undefined,
          redirectUri: input.redirectUri ?? undefined,
          enabled: input.enabled ?? undefined
        }
      });

      return oauthProviderPresenter(provider);
    }),

  delete: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => {
      await db.appOAuthProvider.delete({
        where: { id: input.id }
      });

      return { success: true };
    })
});
