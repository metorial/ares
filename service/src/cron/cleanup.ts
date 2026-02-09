import { federationDB } from '@metorial-enterprise/federation-data';
import { createCron } from '@metorial/cron';
import { subDays } from 'date-fns';

export let cleanupCron = createCron(
  {
    name: 'fed/id/cleanup',
    cron: '0 0 * * *'
  },
  async () => {
    let now = new Date();
    let oneWeekAgo = subDays(now, 7);
    let oneMonthAgo = subDays(now, 30);

    await federationDB.authAttempt.deleteMany({
      where: { createdAt: { lt: oneWeekAgo } }
    });

    await federationDB.authIntent.deleteMany({
      where: { createdAt: { lt: oneWeekAgo } }
    });

    await federationDB.authBlock.deleteMany({
      where: { blockedAt: { lt: oneWeekAgo } }
    });

    await federationDB.authDeviceUserSession.deleteMany({
      where: {
        expiresAt: { lt: now },
        impersonationId: { not: null }
      }
    });
  }
);
