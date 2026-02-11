import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { userPresenter as authUserPresenter } from '../../auth/presenters';
import { internalApp } from '../_app';

export let userController = internalApp.controller({
  list: internalApp
    .handler()
    .input(
      v.object({
        appId: v.string(),
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });
      let users = await adminService.listUsers({
        app,
        search: input.search,
        after: input.after
      });

      return await Promise.all(users.map(authUserPresenter));
    }),

  get: internalApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => {
      let user = await adminService.getUser({ userId: input.id });
      return await authUserPresenter(user);
    })
});
