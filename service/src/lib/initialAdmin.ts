import { federationDB, FederationID } from '@metorial-enterprise/federation-data';
import { delay } from '@metorial/delay';
import { env } from '../env';

let INITIAL_ADMIN_EMAIL = 'admin@metorial.com';
let INITIAL_ADMIN_PASSWORD = 'metorial';

(async () => {
  if (env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_CLIENT_ID) return;

  let initialAdmin = await federationDB.admin.findFirst({
    where: { email: INITIAL_ADMIN_EMAIL }
  });
  let otherUser = await federationDB.admin.findFirst({
    where: { email: { not: INITIAL_ADMIN_EMAIL } }
  });

  if (!otherUser && !initialAdmin) {
    initialAdmin = await federationDB.admin.upsert({
      where: {
        email: INITIAL_ADMIN_EMAIL
      },
      create: {
        id: await FederationID.generateId('admin'),
        email: INITIAL_ADMIN_EMAIL,
        name: 'Metorial Admin',
        password: await Bun.password.hash(INITIAL_ADMIN_PASSWORD)
      },
      update: {}
    });
  }

  while (initialAdmin) {
    otherUser = await federationDB.admin.findFirst({
      where: { email: { not: INITIAL_ADMIN_EMAIL } }
    });

    if (otherUser) {
      await federationDB.adminSession.deleteMany({
        where: { adminId: initialAdmin.id }
      });
      await federationDB.admin.deleteMany({
        where: { id: initialAdmin.id }
      });
      initialAdmin = null;

      break;
    }

    await delay(1000 * 30);
  }
})().catch(console.error);
