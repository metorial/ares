import {
  Button,
  createEmail,
  createTemplate,
  Layout,
  Text
} from '@metorial-services/relay-client';
import { env } from '../env';
import { createTemplateSender, emailIdentity, sender } from './client';

export let sendEmailVerification = createTemplateSender(
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
  emailIdentity,
  sender
);
