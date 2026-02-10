import type { App, Tenant } from '../../../../prisma/generated/client';

export let appPresenter = (
  app: App & {
    defaultTenant: Tenant | null;
    _count?: { users?: number; tenants?: number };
  }
) => ({
  object: 'ares#app' as const,

  id: app.id,
  clientId: app.clientId,
  slug: app.slug,

  hasTerms: app.hasTerms,
  defaultRedirectUrl: app.defaultRedirectUrl,

  defaultTenant: app.defaultTenant
    ? {
        id: app.defaultTenant.id,
        slug: app.defaultTenant.slug,
        clientId: app.defaultTenant.clientId
      }
    : null,

  counts: {
    users: app._count?.users ?? 0,
    tenants: app._count?.tenants ?? 0
  },

  createdAt: app.createdAt,
  updatedAt: app.updatedAt
});
