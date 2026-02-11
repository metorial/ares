import { notFoundError, ServiceError } from '@lowerdeck/error';
import { v } from '@lowerdeck/validation';
import { sessionService } from '../../../services/session';
import { internalApp } from '../_app';

export let sessionController = internalApp.controller({
  get: internalApp
    .handler()
    .input(
      v.object({
        sessionId: v.string()
      })
    )
    .do(async ({ input }) => {
      let session = await sessionService.getSessionSafe({ sessionId: input.sessionId });
      if (!session) throw new ServiceError(notFoundError('session', input.sessionId));

      return {
        id: session.id,
        userId: session.user.id,
        deviceId: session.device.id,
        impersonationOid: session.impersonationOid,
        loggedOutAt: session.loggedOutAt,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      };
    }),

  logout: internalApp
    .handler()
    .input(
      v.object({
        sessionId: v.string()
      })
    )
    .do(async ({ input }) => {
      let session = await sessionService.getSessionSafe({ sessionId: input.sessionId });
      if (!session) throw new ServiceError(notFoundError('session', input.sessionId));

      await sessionService.logout({ session });

      return {};
    })
});
