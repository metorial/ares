import {
  federationDB,
  FederationID,
  withTransaction
} from '@metorial-enterprise/federation-data';
import { createQueue, QueueRetryError } from '@metorial/queue';

export let createCompanyPeopleQueue = createQueue<{ userId: string }>({
  name: 'fed/id/crecompeo',
  driver: 'bullmq',
  jobOpts: {
    attempts: 10
  }
});

export let createCompanyPeopleQueueProcessor = createCompanyPeopleQueue.process(async data => {
  let user = await federationDB.enterpriseUser.findFirst({
    where: { id: data.userId }
  });
  if (!user) throw new QueueRetryError();

  let people = await federationDB.companyPerson.findMany({
    where: { email: user.email, userId: null }
  });

  await createCompanyPersonQueue.addMany(
    people.map(person => ({
      userId: user.id,
      personId: person.id
    }))
  );
});

export let createCompanyPersonQueue = createQueue<{ userId: string; personId: string }>({
  name: 'fed/id/crecomper',
  driver: 'bullmq',
  jobOpts: {
    attempts: 10
  }
});

export let createCompanyPersonQueueProcessor = createCompanyPersonQueue.process(async data => {
  let user = await federationDB.enterpriseUser.findFirst({
    where: { id: data.userId }
  });
  if (!user) throw new QueueRetryError();

  let person = await federationDB.companyPerson.findFirst({
    where: { id: data.personId, userId: null }
  });
  if (!person) throw new QueueRetryError();

  withTransaction(async db => {
    await db.companyPerson.update({
      where: { id: person.id },
      data: { userId: user.id }
    });

    let enterprise = await db.enterpriseAccount.findFirst({
      where: { companyId: person.companyId }
    });

    if (enterprise) {
      await db.enterpriseMember.upsert({
        where: {
          enterpriseAccountId_userId: {
            enterpriseAccountId: enterprise.id,
            userId: user.id
          }
        },
        create: {
          id: await FederationID.generateId('enterpriseMember'),
          userId: user.id,
          personId: person.id,
          enterpriseAccountId: enterprise.id
        },
        update: {}
      });
    }
  });
});
