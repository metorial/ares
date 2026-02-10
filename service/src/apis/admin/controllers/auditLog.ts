import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { adminService } from '../../../services/admin';
import { adminApp } from '../middleware/admin';
import { auditLogPresenter } from '../presenters';

export let auditLogController = adminApp.controller({
  list: adminApp
    .handler()
    .input(
      v.object({
        appId: v.string(),
        after: v.optional(v.string()),
        type: v.optional(v.string())
      })
    )
    .do(async ({ input }) => {
      let app = await adminService.getApp({ appId: input.appId });

      let afterLog = input.after
        ? await db.auditLog.findUnique({ where: { id: input.after } })
        : null;

      let logs = await db.auditLog.findMany({
        where: {
          appOid: app.oid,
          ...(input.type ? { type: input.type } : {}),
          ...(afterLog ? { createdAt: { lt: afterLog.createdAt } } : {})
        },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      return logs.map(auditLogPresenter);
    })
});
