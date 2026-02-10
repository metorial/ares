import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import { v } from '@lowerdeck/validation';
import { db } from '../../../db';
import { env } from '../../../env';
import { tickets } from '../../../lib/tickets';
import { authService } from '../../../services/auth';
import { deviceService } from '../../../services/device';
import { publicApp } from '../_app';
import { deviceApp } from '../middleware/device';
import { authAttemptPresenter, authIntentPresenter, deviceUserPresenter } from '../presenters';

let redirectUrlValidator = v.string({
  modifiers:
    process.env.ALLOW_CORS == 'true'
      ? []
      : [
          v.url({
            hostnames: [
              'metorial.com',
              'metorial.work',

              ...[
                'app',
                'auth',
                'id',
                'api',
                'user',
                'account',
                'dashboard',
                'team',
                'organization',
                'checkout',
                'billing',
                'support'
              ].flatMap(s => [`${s}.metorial.com`, `${s}.metorial.work`]),

              ...(process.env.NODE_ENV != 'production' ||
              process.env.METORIAL_ENV != 'production'
                ? ['localhost', 'wsx', 'metorial.test', 'chronos', 'vulcan']
                : [])
            ]
          })
        ]
});

export let authenticationController = publicApp.controller({
  boot: deviceApp.handler().do(async ({ device }) => {
    let users = await deviceService.getLoggedInAndLoggedOutUsersForDevice({ device });

    // Get default app - TODO: support multi-tenant apps
    let app = await db.app.findFirst();
    if (!app) throw new ServiceError(notFoundError('app'));

    let { options } = await authService.getAuthOptions({ app });

    return {
      options,

      captcha: {
        type: 'required',
        siteKey: env.turnstile.TURNSTILE_SITE_KEY
      },

      defaultRedirectUrl: app.defaultRedirectUrl,

      users: await Promise.all(users.map(deviceUserPresenter))
    };
  }),

  start: deviceApp
    .handler()
    .input(
      v.union([
        v.object({
          type: v.literal('email'),
          email: v.string(),
          redirectUrl: redirectUrlValidator,
          captchaToken: v.string()
        }),
        v.object({
          type: v.literal('oauth'),
          provider: v.enumOf(['google', 'github']),
          redirectUrl: redirectUrlValidator
        }),
        v.object({
          type: v.literal('sso'),
          redirectUrl: redirectUrlValidator
        }),
        v.object({
          type: v.literal('session'),
          userOrSessionId: v.string(),
          redirectUrl: redirectUrlValidator
        }),
        v.object({
          type: v.literal('internal'),
          token: v.string(),
          redirectUrl: redirectUrlValidator
        })
      ])
    )
    .do(async ({ context, device, input }) => {
      // Get default app - TODO: support multi-tenant apps
      let app = await db.app.findFirst();
      if (!app) throw new ServiceError(notFoundError('app'));

      let getSSO = async (p?: { email?: string }) => ({
        type: 'hook' as const,
        url: `${env.service.ARES_AUTH_URL}/metorial-ares/hooks/sso/${await tickets.encode({
          type: 'sso',
          deviceId: device.id,
          redirectUrl: input.redirectUrl,
          email: p?.email
        })}`
      });

      if (input.type == 'email' || input.type == 'session') {
        let email = input.type == 'email' ? input.email : undefined;

        if (input.type == 'session') {
          let sessions = await deviceService.getLoggedInAndLoggedOutUsersForDevice({ device });
          let session = sessions.find(
            s => s.id == input.userOrSessionId || s.user.id == input.userOrSessionId
          );
          if (!session) {
            throw new ServiceError(badRequestError({ message: 'User not logged in' }));
          }

          email = session.user.email;
        }

        if (!email) throw new Error('WTF');

        let res = await authService.authWithEmail({
          context: {
            ip: context.ip,
            ua: context.ua ?? ''
          },
          device,
          email,
          redirectUrl: input.redirectUrl,
          captchaToken: input.type == 'email' ? input.captchaToken : undefined,
          app
        });

        if (res.type == 'auth_attempt') {
          return {
            type: 'auth_attempt' as const,
            authAttempt: authAttemptPresenter(res.authAttempt)
          };
        } else if (res.type == 'auth_intent') {
          let fullAuthIntent = await authService.getAuthIntent({
            authIntentId: res.authIntent.id,
            clientSecret: res.authIntent.clientSecret
          });

          return {
            type: 'auth_intent' as const,
            authIntent: authIntentPresenter(fullAuthIntent)
          };
        }
      }

      if (input.type == 'oauth') {
        return {
          type: 'hook' as const,
          url: `${env.service.ARES_AUTH_URL}/metorial-ares/hooks/oauth/${await tickets.encode({
            type: 'oauth',
            provider: input.provider,
            deviceId: device.id,
            redirectUrl: input.redirectUrl
          })}`
        };
      }

      if (input.type == 'sso') {
        return await getSSO();
      }

      if (input.type == 'internal') {
        let res = await authService.authWithImpersonationToken({
          context: {
            ip: context.ip,
            ua: context.ua ?? ''
          },
          device,
          impersonationClientSecret: input.token,
          redirectUrl: input.redirectUrl
        });

        return {
          type: 'auth_attempt' as const,
          authAttempt: authAttemptPresenter(res)
        };
      }

      throw new Error('Invalid input');
    })
});
