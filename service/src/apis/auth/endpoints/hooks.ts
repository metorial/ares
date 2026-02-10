import { badRequestError, ServiceError } from '@lowerdeck/error';
import { createHono } from '@lowerdeck/hono';
import { generateCustomId } from '@lowerdeck/id';
import { v } from '@lowerdeck/validation';
import type Cookie from 'cookie';
import * as Cookies from 'cookie';
import { env } from '../../../env';
import { authService } from '../../../services/auth';
import { deviceService } from '../../../services/device';
import { tickets } from '../../../lib/tickets';
import { resolveApp } from '../lib/resolveApp';
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
  .get('/oauth/:ticket', async ctx => {
    let ticket = await tickets.decode(
      ctx.req.param('ticket'),
      v.object({
        type: v.literal('oauth'),
        appClientId: v.string(),
        provider: v.enumOf(['google', 'github']),
        deviceId: v.string(),
        redirectUrl: v.string()
      })
    );

    let app = await resolveApp(ticket.appClientId);

    let state = generateCustomId('oauth_state', 50);

    ctx.res.headers.append(
      'Set-Cookie',
      Cookies.serialize(
        `metorial_oauth_state_${state}`,
        JSON.stringify({
          appClientId: ticket.appClientId,
          provider: ticket.provider,
          redirectUrl: ticket.redirectUrl,
          deviceId: ticket.deviceId
        }),
        {
          path: '/'
        }
      )
    );

    let url = await authService.getSocialProviderAuthUrl({
      provider: ticket.provider,
      state,
      app
    });

    return ctx.redirect(url);
  })
  .get('/oauth-response/:provider', async ctx => {
    let provider = ctx.req.param('provider');
    let code = ctx.req.query('code');
    let state = ctx.req.query('state');

    if (!code || !state) {
      throw new ServiceError(badRequestError({ message: 'Missing code or state' }));
    }

    let cookieHeader = ctx.req.header('cookie') ?? '';
    let cookies = Cookies.parse(cookieHeader);
    let stateCookie = cookies[`metorial_oauth_state_${state}`];
    if (!stateCookie) {
      throw new ServiceError(badRequestError({ message: 'Invalid OAuth state' }));
    }

    let stateData = JSON.parse(stateCookie) as {
      appClientId: string;
      provider: string;
      redirectUrl: string;
      deviceId: string;
    };

    let app = await resolveApp(stateData.appClientId);
    let device = await deviceService.dangerouslyGetDeviceOnlyById({ deviceId: stateData.deviceId });

    let ip = ctx.req.header('x-forwarded-for') ?? ctx.req.header('x-real-ip') ?? '';
    let ua = ctx.req.header('user-agent') ?? '';

    let res = await authService.authWithSocialProviderToken({
      provider: provider as 'google' | 'github',
      code,
      app,
      device,
      redirectUrl: stateData.redirectUrl,
      context: { ip, ua }
    });

    if (res.type == 'auth_attempt') {
      let session = await deviceService.exchangeAuthAttemptForSession({
        authAttempt: res.authAttempt
      });

      ctx.res.headers.append(
        'Set-Cookie',
        Cookies.serialize(SESSION_ID_COOKIE_NAME, session.id, baseCookieOpts)
      );

      return ctx.redirect(res.authAttempt.redirectUrl);
    }

    return ctx.redirect(
      `${env.urls.AUTH_FRONTEND_HOST}/auth-intent?authIntentId=${res.authIntent.id}&authIntentClientSecret=${res.authIntent.clientSecret}`
    );
  })
  .get('/sso/:ticket', async ctx => {
    let ticket = await tickets.decode(
      ctx.req.param('ticket'),
      v.object({
        type: v.literal('sso'),
        appClientId: v.string(),
        deviceId: v.string(),
        redirectUrl: v.string(),
        email: v.optional(v.string())
      })
    );

    let _app = await resolveApp(ticket.appClientId);

    // TODO: SSO not yet implemented - needs authService.getSsoAuthUrl
    throw new ServiceError(badRequestError({ message: 'SSO not yet implemented' }));
  })
  .get('/sso-response', async ctx => {
    throw new ServiceError(badRequestError({ message: 'SSO response not yet implemented' }));
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
