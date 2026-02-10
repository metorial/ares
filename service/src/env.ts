import { createValidatedEnv } from '@lowerdeck/env';
import { v } from '@lowerdeck/validation';

export let env = createValidatedEnv({
  service: {
    REDIS_URL: v.string(),
    DATABASE_URL: v.string(),
    RELAY_URL: v.string(),

    ARES_AUTH_URL: v.string(),
    ARES_ADMIN_URL: v.string(),
    ARES_INTERNAL_URL: v.string()
  },

  email: {
    EMAIL_NAME: v.string(),
    EMAIL_ADDRESS: v.string()
  },

  domains: {
    COOKIE_DOMAIN: v.string()
  },

  urls: {
    AUTH_FRONTEND_HOST: v.string()
  },

  turnstile: {
    TURNSTILE_SITE_KEY: v.string(),
    TURNSTILE_SECRET_KEY: v.string()
  },

  keys: {
    AUTH_TICKET_SECRET: v.string()
  }
});
