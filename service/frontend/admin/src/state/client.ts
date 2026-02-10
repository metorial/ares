import { createClient } from '@lowerdeck/rpc-client';
import type { AdminClient } from '../../../../src/apis/admin/controllers';

export let adminClient = createClient<AdminClient>({
  endpoint: '/metorial-admin/api'
});
