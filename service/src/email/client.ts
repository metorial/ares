import {
  createRelayClient,
  type EmailIdentity,
  type ITemplate
} from '@metorial-services/relay-client';
import { env } from '../env';

export let relay = createRelayClient({
  endpoint: env.service.RELAY_URL
});

export let sender = await relay.sender.upsert({
  identifier: 'metorial-ares',
  name: 'Metorial Ares'
});

export let emailIdentity = await relay.emailIdentity.upsert({
  name: env.email.EMAIL_NAME,
  email: env.email.EMAIL_ADDRESS,
  senderId: sender.id
});

export let createTemplateSender = <Data>(
  template: ITemplate<Data>,
  identity: EmailIdentity | Promise<EmailIdentity>,
  sender: { id: string } | Promise<{ id: string }>
) => {
  return {
    send: async (i: { data: Data; to: string[] }) => {
      let rendered = await template.render(i.data);

      let a = await relay.email.send({
        type: 'email',
        to: i.to,
        template: i.data as any,

        emailIdentityId: (await identity).id,
        senderId: (await sender).id,

        content: {
          subject: rendered.subject,
          html: await rendered.html,
          text: await rendered.text
        }
      });

      console.log(a);

      return a;
    }
  };
};
