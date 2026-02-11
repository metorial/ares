import { Paginator } from '@lowerdeck/pagination';
import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { userPresenter as authUserPresenter } from '../../auth/presenters';
import { internalApp } from '../_app';

export let userController = internalApp.controller({
  list: internalApp
    .handler()
    .input(
      Paginator.validate(
        v.object({
          appId: v.string(),
          search: v.optional(v.string())
        })
      )
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });
      let paginator = await adminService.listUsers({ app, search: input.search });
      let list = await paginator.run(input);
      return Paginator.presentLight(list, authUserPresenter);
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
