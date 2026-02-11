import { Paginator } from '@lowerdeck/pagination';
import { v } from '@lowerdeck/validation';
import { env } from '../../../env';
import { adminService } from '../../../services/admin';
import { ssoService } from '../../../services/sso';
import { internalApp } from '../_app';
import { ssoConnectionPresenter, ssoTenantPresenter } from '../presenters';

export let ssoController = internalApp.controller({
  listTenants: internalApp
    .handler()
    .input(
      Paginator.validate(
        v.object({
          appId: v.string()
        })
      )
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });
      let paginator = await ssoService.listTenants({ app });
      let list = await paginator.run(input);
      return Paginator.presentLight(list, ssoTenantPresenter);
    }),

  getTenant: internalApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => {
      let tenant = await ssoService.getTenantById({ tenantId: input.id });
      return ssoTenantPresenter(tenant);
    }),

  createTenant: internalApp
    .handler()
    .input(
      v.object({
        appId: v.string(),
        name: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });
      let tenant = await ssoService.createTenant({
        app,
        input: { name: input.name }
      });
      return ssoTenantPresenter({ ...tenant, _count: { connections: 0 } });
    }),

  createSetup: internalApp
    .handler()
    .input(
      v.object({
        tenantId: v.string(),
        redirectUri: v.string()
      })
    )
    .do(async ({ input }) => {
      let tenant = await ssoService.getTenantById({ tenantId: input.tenantId });
      let setup = await ssoService.createSetup({
        tenant,
        input: { redirectUri: input.redirectUri }
      });

      return {
        setupUrl: `${env.service.ARES_SSO_URL}/sso/setup?clientSecret=${setup.clientSecret}`
      };
    }),

  listConnections: internalApp
    .handler()
    .input(
      Paginator.validate(
        v.object({
          tenantId: v.string()
        })
      )
    )
    .do(async ({ input }) => {
      let tenant = await ssoService.getTenantById({ tenantId: input.tenantId });
      let paginator = await ssoService.listConnections({ tenant });
      let list = await paginator.run(input);
      return Paginator.presentLight(list, ssoConnectionPresenter);
    })
});
