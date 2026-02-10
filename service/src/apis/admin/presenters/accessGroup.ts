import type {
  AccessGroup,
  AccessGroupAssignment,
  AccessGroupRule,
  App,
  AppSurface
} from '../../../../prisma/generated/client';

export let accessGroupPresenter = (
  accessGroup: AccessGroup & {
    rules?: AccessGroupRule[];
    _count?: { rules?: number };
    assignments?: (AccessGroupAssignment & {
      app?: Pick<App, 'id' | 'clientId'> | null;
      appSurface?: Pick<AppSurface, 'id' | 'clientId'> | null;
    })[];
  }
) => ({
  object: 'ares#accessGroup' as const,

  id: accessGroup.id,
  name: accessGroup.name,

  rules: accessGroup.rules?.map(rule => ({
    id: rule.id,
    type: rule.type,
    value: rule.value
  })),

  assignments: accessGroup.assignments?.map(a => ({
    id: a.id,
    target: a.app
      ? { type: 'app' as const, id: a.app.id, clientId: a.app.clientId }
      : a.appSurface
        ? { type: 'surface' as const, id: a.appSurface.id, clientId: a.appSurface.clientId }
        : null,
    createdAt: a.createdAt
  })),

  counts: {
    rules: accessGroup._count?.rules ?? accessGroup.rules?.length ?? 0
  },

  createdAt: accessGroup.createdAt,
  updatedAt: accessGroup.updatedAt
});
