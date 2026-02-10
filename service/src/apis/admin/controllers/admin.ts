import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { adminApp } from '../middleware/admin';
import { adminPresenter } from '../presenters';

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

      return admins.map(adminPresenter);
    })
});
