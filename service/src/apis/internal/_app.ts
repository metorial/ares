import { Group } from '@lowerdeck/rpc-server';

export let internalApp = new Group().use(async ctx => {
  return {
    context: {
      ip: ctx.ip ?? '0.0.0.0',
      ua: ctx.headers.get('user-agent')
    }
  };
});
