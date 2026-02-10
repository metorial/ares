import { badRequestError, ServiceError } from '@lowerdeck/error';
import { createHono } from '@lowerdeck/hono';
import { generateId } from '@lowerdeck/id';
import { getCookie, setCookie } from 'hono/cookie';
import { env } from '../../../env';
import { socials } from '../../../lib/socials';
import { adminService } from '../../../services/admin';
import { ADMIN_SESSION_COOKIE_NAME } from '../middleware/admin';

let getGoogleCredentials = () => {
  let clientId = env.admin.ADMIN_GOOGLE_CLIENT_ID;
  let clientSecret = env.admin.ADMIN_GOOGLE_CLIENT_SECRET;
  let redirectUri = env.admin.ADMIN_GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ServiceError(
      badRequestError({ message: 'Admin Google OAuth is not configured' })
    );
  }

  return { clientId, clientSecret, redirectUri };
};

export let adminAuthApp = createHono()
  .get('/auth/google', async c => {
    let redirectUrl = c.req.query('redirect_url') || `${env.service.ARES_ADMIN_URL}/users`;
    let state = generateId('admsta_');

    setCookie(
      c,
      `metorial_admin_oauth_state_${state}`,
      JSON.stringify({ state, redirectUrl }),
      {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      }
    );

    let credentials = getGoogleCredentials();
    let url = socials.google.getAuthUrl(state, credentials);

    return c.redirect(url);
  })
  .get('/auth/google/callback', async c => {
    let code = c.req.query('code');
    let state = c.req.query('state');

    if (!code || !state) {
      return c.text('Missing code or state', 400);
    }

    let cookie = getCookie(c, `metorial_admin_oauth_state_${state}`);
    if (!cookie) {
      return c.text('Invalid state', 400);
    }

    let parsed: { state: string; redirectUrl: string } = JSON.parse(cookie);
    if (parsed.state !== state) {
      return c.text('Invalid state', 400);
    }

    let credentials = getGoogleCredentials();
    let socialData = await socials.google.exchangeCodeForData(code, credentials);

    if (!socialData.email) {
      throw new ServiceError(
        badRequestError({ message: 'Google did not return an email address' })
      );
    }

    if (!socialData.email.endsWith('@metorial.com')) {
      throw new ServiceError(badRequestError({ message: 'Google account is not allowed' }));
    }

    let context = {
      ip: c.req.header('x-forwarded-for') || '0.0.0.0',
      ua: c.req.header('user-agent') || ''
    };

    let session = await adminService.adminLoginWithOAuth({
      email: socialData.email,
      name: socialData.name ?? socialData.email.split('@')[0]!,
      context
    });

    setCookie(c, ADMIN_SESSION_COOKIE_NAME, session.clientSecret, {
      path: '/',
      expires: new Date(session.expiresAt),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    return c.redirect(parsed.redirectUrl);
  });
