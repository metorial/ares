import { createIdGenerator, idType } from '@lowerdeck/id';
import { Snowflake } from '@lowerdeck/snowflake';

export let ID = createIdGenerator({
  app: idType.sorted('app_'),
  tenant: idType.sorted('atn_'),

  app_clientId: idType.key('appcid_'),
  tenant_clientId: idType.key('tncid_'),

  authIntent: idType.sorted('ain_'),
  authIntentStep: idType.sorted('ast_'),
  authIntentCode: idType.sorted('aic_'),
  authIntentVerificationAttempt: idType.sorted('ava_'),
  authAttempt: idType.sorted('aat_'),
  authDevice: idType.sorted('adv_'),
  authDeviceUserSession: idType.sorted('ads_'),

  user: idType.sorted('usr_'),
  userEmail: idType.sorted('ume_'),
  userEmailVerification: idType.sorted('uev_'),
  userIdentity: idType.sorted('uid_'),
  userImpersonation: idType.sorted('uim_'),

  admin: idType.sorted('adm_'),
  adminSession: idType.sorted('asm_'),

  oauthProvider: idType.sorted('oap_'),
  userIdentityProvider: idType.sorted('uip_'),

  sender: idType.sorted('ssn_')
});

let workerIdBits = 12;
let workerIdMask = (1 << workerIdBits) - 1;

let workerId = (() => {
  let array = new Uint16Array(1);
  crypto.getRandomValues(array);
  return array[0]! & workerIdMask;
})();

export let snowflake = new Snowflake({
  workerId,
  datacenterId: 0,
  workerIdBits: workerIdBits,
  datacenterIdBits: 0,
  sequenceBits: 9,
  epoch: new Date('2025-06-01T00:00:00Z')
});

export let getId = <K extends Parameters<typeof ID.generateIdSync>[0]>(model: K) => ({
  oid: snowflake.nextId(),
  id: ID.generateIdSync(model)
});
