import { createHono } from '@lowerdeck/hono';
import { securityHeaders } from '../../../lib/securityHeaders';
import { authHooksApp } from './hooks';
import { publicApp } from './public';

export let endpointApp = createHono()
  .use(securityHeaders)
  .route('/metorial-ares/hooks', authHooksApp)
  .route('', publicApp);
