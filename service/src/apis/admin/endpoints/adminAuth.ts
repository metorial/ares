import { idAdminService } from '@metorial-enterprise/federation-id';
import { createHono, useRequestContext } from '@metorial/hono';
import { generateId } from '@metorial/id';
import { getCookie, setCookie } from 'hono/cookie';

export let adminAuth = createHono()
  .get('/auth/google', async c => {
    let redirectUrl = c.req.query('redirect_url') || 'https://admin.metorial.com/users';
    let context = useRequestContext(c);
    let state = generateId('admsta_');

    setCookie(
      c,
      `metorial_admin_oauth_state_${state}`,
      JSON.stringify({
        state,
        redirectUrl
      }),
      {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    );

    let { url } = await idAdminService.adminGoogleLoginStart({
      context,
      state
    });

    return c.redirect(url);
  })
  .get('/auth/google/callback', async c => {
    let context = useRequestContext(c);
    let code = c.req.query('code');
    let state = c.req.query('state');

    let cookie = getCookie(c, `metorial_admin_oauth_state_${state}`);
    if (!cookie) {
      return c.text('Invalid state', 400);
    }

    let parsed: { state: string; redirectUrl: string } = JSON.parse(cookie);
    if (parsed.state !== state) {
      return c.text('Invalid state', 400);
    }

    let session = await idAdminService.adminGoogleLoginFinish({
      context,
      code: code as string,
      state: state as string
    });

    setCookie(c, 'metorial_admin_session', session.clientSecret, {
      path: '/',
      expires: new Date(session.expiresAt),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    return c.redirect(parsed.redirectUrl);
  })
  .get('/auth/sso', async c => {
    let redirectUrl = c.req.query('redirect_url') || 'https://admin.metorial.com/users';
    let context = useRequestContext(c);
    let state = generateId('admsta_');

    setCookie(
      c,
      `metorial_admin_oauth_state_${state}`,
      JSON.stringify({
        state,
        redirectUrl
      }),
      {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    );

    let redirectUri = new URL(c.req.url);
    redirectUri.pathname = '/auth/sso/callback';

    let { url } = await idAdminService.adminSsoLoginStart({
      context,
      state,
      redirectUri: redirectUri.toString()
    });

    return c.redirect(url);
  })
  .get('/auth/sso/callback', async c => {
    let context = useRequestContext(c);
    let authId = c.req.query('auth_id');

    if (!authId) {
      return c.text('Missing auth_id', 400);
    }

    let { session, auth } = await idAdminService.adminSsoLoginFinish({
      context,
      authId
    });
    let state = auth.state;

    let cookie = getCookie(c, `metorial_admin_oauth_state_${state}`);
    if (!cookie) {
      return c.text('Invalid state', 400);
    }

    let parsed: { state: string; redirectUrl: string } = JSON.parse(cookie);
    if (parsed.state !== state) {
      return c.text('Invalid state', 400);
    }

    setCookie(c, 'metorial_admin_session', session.clientSecret, {
      path: '/',
      expires: new Date(session.expiresAt),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    return c.redirect(parsed.redirectUrl);
  });
