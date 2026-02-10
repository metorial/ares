import { redis } from 'bun';
import { authApi } from './apis/auth';
import { db } from './db';

let server = Bun.serve({
  fetch: authApi,
  port: 52050
});

// let server = Bun.serve({
//   fetch: adminApi,
//   port: 52121
// });

// let server = Bun.serve({
//   fetch: controllerApi,
//   port: 52125
// });

console.log(`Service running on http://localhost:${server.port}`);

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
