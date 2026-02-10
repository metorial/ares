import { createRelayClient } from '@metorial-services/relay-client';
import { once } from '@lowerdeck/once';
import { env } from '../env';

export let client = createRelayClient({
  endpoint: env.service.RELAY_URL,
  sender: {
    identifier: 'metorial-ares',
    name: 'Metorial Ares'
  }
});

// Lazily initialize email identity to avoid blocking server startup
export let emailIdentity = once(async () => {
  return await client.emailIdentity.upsert({
    name: env.email.EMAIL_NAME,
    email: env.email.EMAIL_ADDRESS
  });
});
