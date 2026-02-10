import { createHono } from '@lowerdeck/hono';
import { adminAuthApp } from './adminAuth';
import { publicApp } from './public';

export let endpointApp = createHono().route('', adminAuthApp).route('', publicApp);
