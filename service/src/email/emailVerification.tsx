import { getFederationConfig } from '@metorial-enterprise/federation-config';
import {
  Button,
  createEmail,
  createTemplate,
  Layout,
  Text
} from '@metorial-enterprise/federation-email';
import React from 'react';
import { notificationClient } from './client';

export let sendEmailVerification = notificationClient.createTemplate(
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
              href={getFederationConfig().access.urls.getUserEmailVerifyLink({
                id: userEmailId,
                key
              })}
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
  })
);
