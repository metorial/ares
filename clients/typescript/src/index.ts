import { createClient } from '@lowerdeck/rpc-client';
import type { AresClient } from '../../../service/src/controllers';

type ClientOpts = Parameters<typeof createClient>[0];

export let createAresClient = (o: ClientOpts) => createClient<AresClient>(o);
