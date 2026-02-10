import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { env } from '../../../env';
import { adminService } from '../../../services/admin';
import { ssoService } from '../../../services/sso';
import { adminApp } from '../middleware/admin';
import { ssoConnectionPresenter, ssoTenantPresenter } from '../presenters';

export let ssoController = adminApp.controller({
  listTenants: adminApp
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

  getTenant: adminApp
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

  createTenant: adminApp
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

  createSetup: adminApp
    .handler()
    .input(
      v.object({
        tenantId: v.string(),
        appId: v.string()
      })
    )
    .do(async ({ input }) => {
      let tenant = await ssoService.getTenantById({ tenantId: input.tenantId });

      let setup = await ssoService.createSetup({
        tenant,
        input: {
          redirectUri: `${env.service.ARES_ADMIN_URL}/apps/${input.appId}?sso_setup_complete=1`
        }
      });

      return {
        setupUrl: `${env.service.ARES_SSO_URL}/sso/setup?clientSecret=${setup.clientSecret}`
      };
    }),

  listConnections: adminApp
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
