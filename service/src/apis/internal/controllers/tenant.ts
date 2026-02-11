import { v } from '@lowerdeck/validation';
import { adminService } from '../../../services/admin';
import { internalApp } from '../_app';
import { tenantPresenter } from '../presenters';

export let tenantController = internalApp.controller({
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
      let tenants = await adminService.listTenants(input);
      return tenants.map(tenantPresenter);
    }),

  get: internalApp
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
