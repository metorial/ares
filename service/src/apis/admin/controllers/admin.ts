import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { adminPresenter } from '../presenters';
import { adminApp } from '../middleware/admin';

export let adminController = adminApp.controller({
  list: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => {
      let admins = await adminService.listAdmins(input);

      return {
        data: admins.map(adminPresenter)
      };
    })
});
