import {
  Code,
  createEmail,
  createTemplate,
  Layout,
  Text
} from '@metorial-services/relay-client';
import { client, emailIdentity } from './client';

export let sendAuthCodeEmail = client.createTemplate(
  createTemplate({
    render: ({ code }: { code: string }) => {
      let splitCode = code;
      if (code.length === 6) {
        let first3 = code.slice(0, 3);
        let last3 = code.slice(3, 6);
        splitCode = `${first3}-${last3}`;
      }

      return createEmail({
        subject: `Your Metorial authentication code: ${splitCode}`,
        preview: `Your authentication code for Metorial is ${splitCode}.`,
        content: (
          <Layout
            title={`Your Metorial code`}
            description={`Use the authentication code below to confirm your email address.`}
          >
            <Code code={code} />

            <Text>
              Do not share this code with anyone. If you did not request this code please
              ignore this email.
            </Text>
          </Layout>
        )
      });
    }
  }),
  emailIdentity
);
