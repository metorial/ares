import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { env } from '../../../env';
import { adminService } from '../../../services/admin';
import { ssoService } from '../../../services/sso';
import { internalApp } from '../_app';
import { ssoConnectionPresenter, ssoTenantPresenter } from '../presenters';

export let ssoController = internalApp.controller({
  listTenants: internalApp
    .handler()
    .input(
      v.object({
        appId: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });

      let tenants = await db.ssoTenant.findMany({
        where: { appOid: app.oid },
        include: {
          _count: { select: { connections: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return tenants.map(ssoTenantPresenter);
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

      let tenantWithCount = await db.ssoTenant.findUnique({
        where: { oid: tenant.oid },
        include: {
          _count: { select: { connections: true } }
        }
      });

      return ssoTenantPresenter(tenantWithCount!);
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
        input: {
          redirectUri: input.redirectUri
        }
      });

      return {
        setupUrl: `${env.service.ARES_SSO_URL}/sso/setup?clientSecret=${setup.clientSecret}`
      };
    }),

  listConnections: internalApp
    .handler()
    .input(
      v.object({
        tenantId: v.string()
      })
    )
    .do(async ({ input }) => {
      let tenant = await ssoService.getTenantById({ tenantId: input.tenantId });
      let connections = await ssoService.getConnectionsByTenant({ tenant });

      return connections.map(ssoConnectionPresenter);
    })
});
