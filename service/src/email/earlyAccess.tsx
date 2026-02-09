import {
  Button,
  createEmail,
  createTemplate,
  Layout,
  Text
} from '@metorial-enterprise/federation-email';
import React from 'react';
import { EarlyAccessRegistration } from '../earlyAccess';
import { notificationClient } from './client';

export let earlyAccessEmail = notificationClient.createTemplate(
  createTemplate({
    render: ({ earlyAccess }: { earlyAccess: EarlyAccessRegistration }) =>
      createEmail({
        subject: `Thank you for signing up for early access!`,
        preview: `We're so excited to have you on board.`,
        content: (
          <Layout
            title={`Thank you for signing up for early access!`}
            description={`We're so excited to have you on board! We'll be in touch with you shortly. In the mean time, you can share Metorial by clicking the button below.`}
          >
            <Button
              href={`https://metorial.com/early-access?ticket_id=${encodeURIComponent(earlyAccess.ticketId!)}`}
            >
              Share Metorial
            </Button>

            <Text>
              Please don't hesitate to reach out if you have any questions or need help.
            </Text>
          </Layout>
        )
      })
  })
);
