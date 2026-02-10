import { createServer, type InferClient } from '@lowerdeck/rpc-server';
import { publicApp } from '../middleware/admin';
import { adminController } from './admin';
import { appController } from './app';
import { auditLogController } from './auditLog';
import { authenticationController } from './auth';
import { oauthProviderController } from './oauthProvider';
import { ssoController } from './sso';
import { tenantController } from './tenant';
import { userController } from './user';
import { accessGroupController } from './accessGroup';

let rootController = publicApp.controller({
  authentication: authenticationController,
  user: userController,
  admin: adminController,
  app: appController,
  tenant: tenantController,
  sso: ssoController,
  oauthProvider: oauthProviderController,
  auditLog: auditLogController,
  accessGroup: accessGroupController
});

export let adminRPC = createServer({})(rootController);

export type AdminClient = InferClient<typeof rootController>;
