import { createRelayClient } from '@metorial-services/relay-client';
import { env } from '../env';

export let client = createRelayClient({
  endpoint: env.service.RELAY_URL,
  sender: {
    identifier: 'metorial-ares',
    name: 'Metorial Ares'
  }
});

export let emailIdentity = client.emailIdentity.upsert({
  name: env.email.EMAIL_NAME,
  email: env.email.EMAIL_ADDRESS
});
