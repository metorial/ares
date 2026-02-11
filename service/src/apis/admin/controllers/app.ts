import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { adminApp } from '../middleware/admin';
import { appPresenter } from '../presenters';

export let appController = adminApp.controller({
  list: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => {
      let apps = await adminService.listApps(input);

      return apps.map(appPresenter);
    }),

  get: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.id });
      return appPresenter(app);
    }),

  create: adminApp
    .handler()
    .input(
      v.object({
        defaultRedirectUrl: v.string(),
        slug: v.optional(v.string()),
        redirectDomains: v.optional(v.array(v.string()))
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.createApp(input);
      return appPresenter(app);
    }),

  update: adminApp
    .handler()
    .input(
      v.object({
        id: v.string(),
        slug: v.optional(v.string()),
        redirectDomains: v.optional(v.array(v.string()))
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.updateApp({
        appId: input.id,
        slug: input.slug,
        redirectDomains: input.redirectDomains
      });
      return appPresenter(app);
    })
});
