import { createServer, type InferClient } from '@lowerdeck/rpc-server';
import { publicApp } from '../middleware/admin';
import { adminController } from './admin';
import { appController } from './app';
import { authenticationController } from './auth';
import { ssoController } from './sso';
import { tenantController } from './tenant';
import { userController } from './user';

let rootController = publicApp.controller({
  authentication: authenticationController,
  user: userController,
  admin: adminController,
  app: appController,
  tenant: tenantController,
  sso: ssoController
});

export let adminRPC = createServer({})(rootController);

export type AdminClient = InferClient<typeof rootController>;
