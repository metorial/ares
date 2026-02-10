import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import { parseForwardedFor } from '@lowerdeck/forwarded-for';
import { createHono } from '@lowerdeck/hono';
import { generateCustomId } from '@lowerdeck/id';
import { v } from '@lowerdeck/validation';
import type Cookie from 'cookie';
import * as Cookies from 'cookie';
import { env } from '../../../env';
import { authService } from '../../../services/auth';
import { deviceService } from '../../../services/device';
import { tickets } from '../../../lib/tickets';
import { SESSION_ID_COOKIE_NAME } from '../middleware/device';

let isProd = process.env.NODE_ENV === 'production';

let baseCookieOpts: Cookie.SerializeOptions = {
  domain: env.domains.COOKIE_DOMAIN,
  path: '/',
  maxAge: 60 * 60 * 24 * 365
};

if (isProd) {
  baseCookieOpts = {
    ...baseCookieOpts,
    secure: true,
    httpOnly: true,
    sameSite: 'lax' as const
  };
}

export let authHooksApp = createHono()
  // TODO: OAuth and SSO endpoints need an 'app' parameter to work.
  // The auth service requires an App context to look up OAuth provider credentials.
  // Need to determine:
  // 1. How should the app be determined? (from subdomain, query param, default app, etc.)
  // 2. Should there be a default app for single-tenant deployments?
  // 3. Where should the app lookup logic be added?

  .get('/oauth/:ticket', async ctx => {
    let ticket = await tickets.decode(
      ctx.req.param('ticket'),
      v.object({
        type: v.literal('oauth'),
        provider: v.enumOf(['google', 'github']),
        deviceId: v.string(),
        redirectUrl: v.string()
      })
    );

    let state = generateCustomId('oauth_state', 50);

    ctx.res.headers.append(
      'Set-Cookie',
      Cookies.serialize(
        `metorial_oauth_state_${state}`,
        JSON.stringify({
          provider: ticket.provider,
          redirectUrl: ticket.redirectUrl,
          deviceId: ticket.deviceId
        }),
        {
          path: '/'
        }
      )
    );

    // TODO: Need to get the app context here
    // let url = await authService.getSocialProviderAuthUrl({
    //   provider: ticket.provider,
    //   state,
    //   app: ???
    // });

    throw new ServiceError(badRequestError({ message: 'OAuth not yet implemented' }));
  })
  .get('/oauth-response/:provider', async ctx => {
    // TODO: Same issue - needs app context
    throw new ServiceError(badRequestError({ message: 'OAuth not yet implemented' }));
  })
  .get('/sso/:ticket', async ctx => {
    // TODO: SSO needs app context - see authService.getSsoAuthUrl
    throw new ServiceError(badRequestError({ message: 'SSO not yet implemented' }));
  })
  .get('/sso-response', async ctx => {
    // TODO: SSO needs app context - see authService.authWithSsoToken
    throw new ServiceError(badRequestError({ message: 'SSO not yet implemented' }));
  })

  .get('/auth-attempt/:ticket', async ctx => {
    let ticket = await tickets.decode(
      ctx.req.param('ticket'),
      v.object({
        type: v.literal('auth_attempt'),
        authAttemptId: v.string(),
        authAttemptClientSecret: v.optional(v.string())
      })
    );

    let authAttempt = await authService.dangerouslyGetAuthAttemptOnlyById({
      authAttemptId: ticket.authAttemptId
    });
    if (authAttempt.status != 'consumed') {
      if (authAttempt.clientSecret != ticket.authAttemptClientSecret) {
        throw new ServiceError(
          badRequestError({
            message: 'Auth attempt not consumed'
          })
        );
      }

      let session = await deviceService.exchangeAuthAttemptForSession({
        authAttempt
      });

      ctx.res.headers.append(
        'Set-Cookie',
        Cookies.serialize(SESSION_ID_COOKIE_NAME, session.id, baseCookieOpts)
      );
    }

    return ctx.redirect(authAttempt.redirectUrl);
  });
