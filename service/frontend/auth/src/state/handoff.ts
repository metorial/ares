import { createLoader } from '@metorial-io/data-hooks';
import { authClient } from './client';

export let handoffState = createLoader({
  name: 'handoff',
  hash: ai => ai.clientId,
  fetch: (d: { clientId: string; redirectUri: string; state?: string }) => {
    return authClient.handoff.start({
      clientId: d.clientId,
      redirectUri: d.redirectUri,
      state: d.state
    });
  },
  mutators: {
    accept: async (d: {}, { output }) => {
      let ai = await authClient.handoff.accept({
        handoffAuthenticationId: output.id,
        clientId: output.application.clientId
      });

      window.location.replace(ai.redirect);

      // Will never resolve
      return new Promise<never>(() => {});
    }
  }
});
