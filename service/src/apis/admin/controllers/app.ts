import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { appPresenter } from '../presenters';
import { adminApp } from '../middleware/admin';

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

      return {
        data: apps.map(appPresenter)
      };
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
    })
});
