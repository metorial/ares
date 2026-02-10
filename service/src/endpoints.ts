import { redis } from 'bun';
import { adminApi } from './apis/admin';
import { authApi } from './apis/auth';
import { db } from './db';

let server = Bun.serve({
  fetch: authApi,
  port: 52120
});

let adminServer = Bun.serve({
  fetch: adminApi,
  port: 52121
});

// let server = Bun.serve({
//   fetch: controllerApi,
//   port: 52125
// });

console.log(`Auth service running on http://localhost:${server.port}`);
console.log(`Admin service running on http://localhost:${adminServer.port}`);

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
