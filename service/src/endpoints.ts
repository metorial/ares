import { redis } from 'bun';
import { adminApi } from './apis/admin';
import { authApi } from './apis/auth';
import { internalApi } from './apis/internal';
import { ssoApi } from './apis/sso';
import { db } from './db';
import { ensureAdminApp } from './lib/adminApp';

await ensureAdminApp();

let server = Bun.serve({
  fetch: authApi,
  port: 52120
});

let adminServer = Bun.serve({
  fetch: adminApi,
  port: 52121
});

let ssoServer = Bun.serve({
  fetch: ssoApi,
  port: 52122
});

let internalServer = Bun.serve({
  fetch: internalApi,
  port: 52123
});

console.log(`Auth service running on http://localhost:${server.port}`);
console.log(`Admin service running on http://localhost:${adminServer.port}`);
console.log(`SSO service running on http://localhost:${ssoServer.port}`);
console.log(`Internal service running on http://localhost:${internalServer.port}`);

Bun.serve({
  fetch: async _ => {
    try {
      await db.tenant.count();
      await redis.ping();
      return new Response('OK');
    } catch (e) {
      return new Response('Service Unavailable', { status: 503 });
    }
  },
  port: 12121
});
