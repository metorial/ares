import { db } from '../db';
import { getId } from '../id';

class AuditLogService {
  log(d: {
    appOid: bigint;
    type: string;
    userOid?: bigint;
    ip?: string | null;
    ua?: string | null;
    metadata?: Record<string, any>;
  }) {
    db.auditLog
      .create({
        data: {
          ...getId('auditLog'),
          appOid: d.appOid,
          type: d.type,
          userOid: d.userOid ?? null,
          ip: d.ip ?? null,
          ua: d.ua ?? null,
          metadata: d.metadata ?? null
        }
      })
      .catch(err => {
        console.error('Failed to write audit log:', err);
      });
  }
}

export let auditLogService = new AuditLogService();
