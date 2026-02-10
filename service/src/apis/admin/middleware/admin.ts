import { idAdminService, sessionService } from '@metorial-enterprise/federation-id';
import { Group } from '@metorial-enterprise/rpc';
import { ServiceError, unauthorizedError } from '@metorial/error';

export const DEVICE_TOKEN_COOKIE_NAME = 'metorial_device_token';
export const SESSION_ID_COOKIE_NAME = 'metorial_session_id';
export const ADMIN_SESSION_COOKIE_NAME = 'metorial_admin_session';

export let publicApp = new Group().use(async ctx => {
  return {
    context: {
      ip: ctx.ip ?? '0.0.0.0',
      ua: ctx.headers.get('user-agent')
    }
  };
});

export let parseDeviceToken = (deviceToken: string | null | undefined) => {
  if (typeof deviceToken !== 'string') return null;

  let parts = deviceToken.split(':');
  let deviceId = parts[0].trim();
  let deviceClientSecret = parts[1].trim();

  if (!deviceId || !deviceClientSecret || parts.length != 2) return null;

  return {
    deviceId,
    deviceClientSecret
  };
};

export let adminApp = publicApp.use(async ctx => {
  let clientSecret = ctx.getCookie(ADMIN_SESSION_COOKIE_NAME);
  let admin = clientSecret ? await idAdminService.authenticateAdmin({ clientSecret }) : null;
  if (admin) return { admin };

  let deviceInfo = parseDeviceToken(ctx.getCookie(DEVICE_TOKEN_COOKIE_NAME));
  let sessionId = ctx.getCookie(SESSION_ID_COOKIE_NAME);

  if (sessionId && deviceInfo) {
    let session = await sessionService.authenticate({
      deviceClientSecret: deviceInfo.deviceClientSecret,
      deviceId: deviceInfo.deviceId,
      sessionId: sessionId,
      context: ctx.context
    });

    if (session?.session.impersonationId) {
      let impersonation = await sessionService.getImpersonationSession({
        session: session.session
      });
      if (impersonation) return { admin: impersonation.admin };
    } else if (session) {
      let admin = await sessionService.findAdminForSession({
        session: session.session
      });
      if (admin) return { admin };

      if (process.env.NODE_ENV == 'development') {
        let admin = await sessionService.upsertDevAdminSession({
          session: session.session
        });
        return { admin };
      }
    }
  }

  throw new ServiceError(unauthorizedError({ message: 'Unauthorized' }));
});
