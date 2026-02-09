import { env } from '../env';

export let socials = {
  google: {
    id: 'google',
    name: 'Google',
    getAuthUrl(state: string) {
      let url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.append('client_id', env.oauth.OAUTH_GOOGLE_CLIENT_ID!);
      url.searchParams.append('redirect_uri', env.oauth.OAUTH_GOOGLE_REDIRECT_URI!);
      url.searchParams.append('response_type', 'code');
      url.searchParams.append('scope', 'openid email profile');
      url.searchParams.append('access_type', 'offline');
      url.searchParams.append('prompt', 'consent');
      url.searchParams.append('state', state);
      return url.toString();
    },
    async exchangeCodeForData(code: string) {
      let tokenData = (await fetch('https://oauth2.googleapis.com/token', {
        body: new URLSearchParams({
          code,
          client_id: env.oauth.OAUTH_GOOGLE_CLIENT_ID!,
          client_secret: env.oauth.OAUTH_GOOGLE_CLIENT_SECRET!,
          redirect_uri: env.oauth.OAUTH_GOOGLE_REDIRECT_URI!,
          grant_type: 'authorization_code'
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST'
      }).then(res => res.json())) as { access_token: string; refresh_token: string };

      if (!tokenData.access_token) {
        throw new Error('No access token; ' + JSON.stringify(tokenData));
      }

      let accountData = (await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        }
      ).then(res => res.json())) as {
        id: string;
        email: string;
        email_verified: boolean;
        name: string;
        picture: string;
      };

      if (!accountData.email) throw new Error('No email');

      return {
        email: accountData.email,
        name: accountData.name || 'Anonymous',
        id: accountData.id + '@google.com',
        token: tokenData.refresh_token,
        photoUrl: accountData.picture
      };
    }
  },

  github: {
    id: 'github',
    name: 'Github',
    getAuthUrl(state: string) {
      let url = new URL('https://github.com/login/oauth/authorize');
      url.searchParams.append('client_id', env.oauth.OAUTH_GITHUB_CLIENT_ID!);
      url.searchParams.append('redirect_uri', env.oauth.OAUTH_GITHUB_REDIRECT_URI!);
      url.searchParams.append('scope', 'user:email');
      url.searchParams.append('state', state);
      return url.toString();
    },
    async exchangeCodeForData(code: string) {
      let tokenDataString = await fetch('https://github.com/login/oauth/access_token', {
        body: new URLSearchParams({
          code,
          client_id: env.oauth.OAUTH_GITHUB_CLIENT_ID!,
          client_secret: env.oauth.OAUTH_GITHUB_CLIENT_SECRET!,
          redirect_uri: env.oauth.OAUTH_GITHUB_REDIRECT_URI!
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'Metorial (https://metorial.com)'
        },
        method: 'POST'
      }).then(res => res.text());

      let tokenData = JSON.parse(tokenDataString) as { access_token: string };

      if (!tokenData.access_token) {
        throw new Error('No access token; ' + JSON.stringify(tokenData));
      }

      let accountDataString = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'Metorial (https://metorial.com)'
        }
      }).then(res => res.text());

      let accountData = JSON.parse(accountDataString) as {
        id: string;
        email: string;
        name: string;
        avatar_url: string;
        login: string;
      };

      if (!accountData.email) {
        let emailDataString = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'Metorial (https://metorial.com)'
          }
        }).then(res => res.text());

        let emailData = JSON.parse(emailDataString) as { email: string; primary: boolean }[];

        accountData.email =
          emailData.find(email => email.primary)?.email || emailData[0].email;
      }

      if (!accountData.email) throw new Error('No email');

      return {
        email: accountData.email,
        name: accountData.name || accountData.login,
        id: accountData.id + '@github.com',
        token: tokenData.access_token,
        photoUrl: accountData.avatar_url
      };
    }
  }
};
