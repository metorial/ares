import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { adminApp } from '../middleware/admin';
import { tenantPresenter } from '../presenters';

export let tenantController = adminApp.controller({
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
      let tenants = await adminService.listTenants(input);

      return tenants.map(tenantPresenter);
    }),

  get: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => {
      let tenant = await adminService.getTenant({ tenantId: input.id });
      return tenantPresenter(tenant);
    })
});
