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

export let sendInviteEmail = notificationClient.createTemplate(
  createTemplate({
    render: ({ email, title, message }: { email: string; title?: string; message?: string }) =>
      createEmail({
        subject: `You have been invited to Metorial`,
        preview: `Let's get you started with Metorial.`,
        content: (
          <Layout
            title={title ?? `Your Metorial Invite`}
            description={
              message ??
              `You have been invited to join Metorial. We're so excited to have you on board! Click the button below to get started.`
            }
          >
            <Button
              href={getFederationConfig().access.urls.getUserInviteLink({
                email
              })}
            >
              Get started
            </Button>

            <Text>
              Please don't hesitate to reach out if you have any questions or need help getting
              started.
            </Text>
          </Layout>
        )
      })
  })
);
