import {
  Button,
  createEmail,
  createTemplate,
  Layout,
  Text
} from '@metorial-services/relay-client';
import { once } from '@lowerdeck/once';
import { env } from '../env';
import { client, emailIdentity } from './client';

let getTemplate = once(async () => {
  return client.createTemplate(
    createTemplate({
      render: ({ key, userEmailId }: { key: string; userEmailId: string }) =>
        createEmail({
          subject: `Verify your email address with Metorial`,
          preview: `Please verify your email address with Metorial.`,
          content: (
            <Layout
              title="Verify your email address"
              description="Click the button below to verify your email address with Metorial."
            >
              <Button
                href={`${env.service.ARES_AUTH_URL}/verify-email?key=${key}&email_id=${userEmailId}`}
              >
                Verify email
              </Button>

              <Text>
                If you did not add this email to your account please visit your account settings
                to remove it. People with access to this email address can access your account.
              </Text>
            </Layout>
          )
        })
    }),
    await emailIdentity()
  );
});

export let sendEmailVerification = {
  send: async (params: { to: string[]; data: { key: string; userEmailId: string } }) => {
    let template = await getTemplate();
    return template.send(params);
  }
};
