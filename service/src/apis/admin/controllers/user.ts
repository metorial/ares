import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { userPresenter } from '../../auth/presenters';
import { adminUserPresenter } from '../presenters';
import { adminApp } from '../middleware/admin';

export let userController = adminApp.controller({
  list: adminApp
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

      return {
        data: await Promise.all(users.map(userPresenter))
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
      let user = await adminService.getUser({ userId: input.id });
      return await adminUserPresenter(user);
    }),

  impersonate: adminApp
    .handler()
    .input(
      v.object({
        id: v.string(),
        reason: v.string(),
        password: v.optional(v.string())
      })
    )
    .do(async ({ input, admin }) => {
      let impersonation = await adminService.impersonateUser({
        userId: input.id,
        reason: input.reason,
        password: input.password,
        admin
      });

      return {
        object: 'ares#impersonation' as const,
        id: impersonation.id,
        clientSecret: impersonation.clientSecret,
        expiresAt: impersonation.expiresAt,
        createdAt: impersonation.createdAt
      };
    })
});
