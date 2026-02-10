import { createServer, type InferClient } from '@lowerdeck/rpc-server';
import { publicApp } from '../middleware/admin';
import { adminController } from './admin';
import { appController } from './app';
import { authenticationController } from './auth';
import { tenantController } from './tenant';
import { userController } from './user';

let rootController = publicApp.controller({
  authentication: authenticationController,
  user: userController,
  admin: adminController,
  app: appController,
  tenant: tenantController
});

export let adminRPC = createServer({})(rootController);

export type AdminClient = InferClient<typeof rootController>;
