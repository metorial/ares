import { federationDB } from '@metorial-enterprise/federation-data';
import { createQueue, QueueRetryError } from '@metorial/queue';
import { userEvents } from '../events';
import { subscribeToBrevo, subscribeToResend } from '../lib/emailMarketing';

export let subscribeToEmailMarketingQueue = createQueue<{ userId: string }>({
  name: 'fed/id/subEMark',
  driver: 'bullmq',
  jobOpts: {
    attempts: 10
  }
});

export let subscribeToEmailMarketingUserEventProcessor = userEvents.task(
  {
    actionNames: ['create'],
    taskName: 'fed/id/subToEmailMarketing'
  },
  async ({ payload }) => subscribeToEmailMarketingQueue.add({ userId: payload.id })
);

export let subscribeToEmailMarketingQueueProcessor = subscribeToEmailMarketingQueue.process(
  async data => {
    let user = await federationDB.enterpriseUser.findFirst({
      where: { id: data.userId }
    });
    if (!user) throw new QueueRetryError();

    let error: Error | undefined;

    try {
      await subscribeToResend(user);
    } catch (e: any) {
      error = e;
    }

    try {
      await subscribeToBrevo(user);
    } catch (e: any) {
      error = error ?? e;
    }

    if (error) throw error;
  }
);
