import type { EnterpriseUser } from '@metorial-enterprise/federation-data';
import { EventObject, eventObjectAction } from '@metorial/event';

let NAME = 'fed/user';

export let userEventObject = eventObjectAction<EnterpriseUser>({
  type: NAME
});

export let userEvents = new EventObject({
  objectName: NAME,
  serviceName: 'auth'
})
  .action(userEventObject('create'))
  .action(userEventObject('update'))
  .action(userEventObject('delete'));
