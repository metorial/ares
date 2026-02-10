import { ServiceError, unauthorizedError } from '@lowerdeck/error';
import { Group } from '@lowerdeck/rpc-server';
import { adminService } from '../../../services/admin';
import { sessionService } from '../../../services/session';
import { extractDeviceInfo, SESSION_ID_COOKIE_NAME } from '../../auth/middleware/device';

export const ADMIN_SESSION_COOKIE_NAME = 'metorial_admin_session';

export let publicApp = new Group().use(async ctx => {
  return {
    context: {
      ip: ctx.ip ?? '0.0.0.0',
      ua: ctx.headers.get('user-agent')
    }
  };
});

export let adminApp = publicApp.use(async ctx => {
  let clientSecret = ctx.getCookie(ADMIN_SESSION_COOKIE_NAME);
  if (clientSecret) {
    try {
      let admin = await adminService.authenticateAdmin({ clientSecret });
      return { admin };
    } catch {}
  }

  let deviceInfo = extractDeviceInfo(ctx);
  let sessionId = ctx.getCookie(SESSION_ID_COOKIE_NAME);

  if (sessionId && deviceInfo) {
    let session = await sessionService.authenticate({
      deviceClientSecret: deviceInfo.deviceClientSecret,
      deviceId: deviceInfo.deviceId,
      sessionId,
      context: {
        ip: ctx.context.ip,
        ua: ctx.context.ua ?? ''
      }
    });

    if (session?.session.impersonationOid) {
      let impersonation = await sessionService.getImpersonationSession({
        session: session.session
      });
      if (impersonation) return { admin: impersonation.admin };
    } else if (session) {
      let sessionWithUser = Object.assign(session.session, { user: session.user });

      let admin = await sessionService.findAdminForSession({
        session: sessionWithUser
      });
      if (admin) return { admin };

      if (process.env.NODE_ENV == 'development') {
        let admin = await sessionService.upsertDevAdminSession({
          session: sessionWithUser
        });
        return { admin };
      }
    }
  }

  throw new ServiceError(unauthorizedError({ message: 'Unauthorized' }));
});
