import { createServer, InferClient, rpcMux } from '@metorial-enterprise/rpc';
import { adminController } from './controller/admin';
import { authenticationController } from './controller/auth';
import { publicApp } from './middleware/admin';

let rootController = publicApp.controller({
  authentication: authenticationController,
  admin: adminController
});

export let adminRPC = createServer({})(rootController);

export let adminApi = rpcMux(
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
    path: '/metorial-admin'
  },
  [adminRPC]
);

export type AdminClient = InferClient<typeof rootController>;

export * from './auth';
