import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { resolveApp } from '../lib/resolveApp';
import { publicApp } from '../_app';

export let oauthController = publicApp.controller({
  exchange: publicApp
    .handler()
    .input(
      v.object({
        clientId: v.string(),
        authorizationCode: v.string()
      })
    )
    .do(async ({ input }) => {
      let app = await resolveApp(input.clientId);

      let authAttempt = await db.authAttempt.findUnique({
        where: { authorizationCode: input.authorizationCode }
      });

      if (!authAttempt || authAttempt.status !== 'consumed') {
        throw new ServiceError(badRequestError({ message: 'Invalid authorization code' }));
      }

      if (authAttempt.appOid !== app.oid) {
        throw new ServiceError(badRequestError({ message: 'Invalid authorization code' }));
      }

      // Null out code for one-time use
      await db.authAttempt.update({
        where: { oid: authAttempt.oid },
        data: { authorizationCode: null }
      });

      let [user, session] = await Promise.all([
        db.user.findUnique({ where: { oid: authAttempt.userOid } }),
        db.authDeviceUserSession.findFirst({
          where: {
            deviceOid: authAttempt.deviceOid,
            userOid: authAttempt.userOid,
            loggedOutAt: null,
            expiresAt: { gte: new Date() }
          }
        })
      ]);

      if (!user) {
        throw new ServiceError(notFoundError('user'));
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName
        },
        session: session
          ? {
              id: session.id,
              expiresAt: session.expiresAt
            }
          : null
      };
    })
});
