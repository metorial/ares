import jack from '@boxyhq/saml-jackson';
import { env } from '../env';

let ret = await jack({
  noAnalytics: true,
  externalUrl: env.sso.SSO_SERVICE_HOST,
  samlPath: '/sso/jxn/saml/callback',
  oidcPath: '/sso/jxn/oidc/callback',
  samlAudience: env.sso.SAML_AUDIENCE,
  db: {
    engine: 'mongo',
    url: env.sso.SSO_MONGO_URL
  },
  idpEnabled: true
});

export let jackson = {
  apiController: ret.apiController,
  oauthController: ret.oauthController,

  redirectUrl: `${env.sso.SSO_SERVICE_HOST}/*`,
  defaultRedirectUrl: {
    saml: `${env.sso.SSO_SERVICE_HOST}/sso/jxn/saml/callback`,
    oidc: `${env.sso.SSO_SERVICE_HOST}/sso/jxn/oidc/callback`
  }
};
