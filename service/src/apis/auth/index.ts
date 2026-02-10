import { apiMux } from '@lowerdeck/api-mux';
import { rpcMux } from '@lowerdeck/rpc-server';
import { authRPC } from './controllers';
import { endpointApp } from './endpoints';

let idApiMux = rpcMux(
  {
    cors:
      process.env.ALLOW_CORS == 'true'
        ? { check: () => true }
        : {
            domains: [
              'localhost',
              'metorial.test',
              'metorial.com',
              'metorial.work',
              'wsx',
              'chronos',
              'vulcan',
              ...(process.env.CORS_DOMAINS?.split(',').map(d => d.trim()) ?? [])
            ]
          },
    path: '/metorial-ares/auth-api'
  },
  [authRPC]
);

export let authApi = apiMux([{ endpoint: idApiMux }], endpointApp.fetch as any);

export type { AuthClient } from './controllers';
