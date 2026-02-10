import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Copy, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { DataList, Heading, Table } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { userState } from '../../../state';

export let UserPage = () => {
  let { userId } = useParams();
  let user = userState.use({ id: userId! });

  return renderWithLoader({ user })(({ user }) => (
    <>
      <Heading as="h1" size="7">
        {user.data.name}
      </Heading>

      <Spacer size={15} />

      <Button
        size="2"
        onClick={() =>
          showModal(({ dialogProps, close }) => {
            let impersonate = useMutation(user.mutators.impersonate);

            let form = useForm({
              initialValues: {
                reason: ''
              },
              onSubmit: async values => {
                let [res] = await impersonate.mutate(values);
                if (res) {
                  close();
                  let url = `${import.meta.env.VITE_AUTH_FRONTEND_URL ?? 'https://auth.metorial.com'}/internal#token=${res.clientSecret}`;

                  showModal(({ dialogProps }) => (
                    <Dialog.Wrapper {...dialogProps}>
                      <Dialog.Title>Impersonation Successful</Dialog.Title>

                      <p>
                        Please copy the URL below and open it in a new private/incognito
                        window.
                      </p>

                      <Spacer size={15} />

                      <Copy value={url} />
                    </Dialog.Wrapper>
                  ));
                }
              },
              schema: yup =>
                yup.object({
                  reason: yup.string().required()
                })
            });

            return (
              <Dialog.Wrapper {...dialogProps}>
                <Dialog.Title>Impersonate User</Dialog.Title>

                <form {...dialogProps} onSubmit={form.handleSubmit}>
                  <Input
                    label="Reason"
                    as="textarea"
                    minRows={5}
                    {...form.getFieldProps('reason')}
                  />
                  <form.RenderError field="reason" />

                  <Spacer size={15} />

                  <Button
                    type="submit"
                    loading={impersonate.isLoading}
                    success={impersonate.isSuccess}
                  >
                    Impersonate
                  </Button>
                  <impersonate.RenderError />
                </form>
              </Dialog.Wrapper>
            );
          })
        }
      >
        Impersonate
      </Button>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        User Profile
      </Heading>

      <DataList.Root>
        {[
          ['ID', user.data.id],
          ['Status', user.data.status],
          ['Email', user.data.email],
          ['Name', user.data.name],
          ['First Name', user.data.firstName],
          ['Last Name', user.data.lastName],
          ['Created At', new Date(user.data.createdAt).toLocaleDateString('de-at')],
          ['Updated At', new Date(user.data.updatedAt).toLocaleDateString('de-at')],
          [
            'Last Login At',
            user.data.lastLoginAt
              ? new Date(user.data.lastLoginAt).toLocaleDateString('de-at')
              : '-'
          ],
          [
            'Last Active At',
            user.data.lastActiveAt
              ? new Date(user.data.lastActiveAt).toLocaleDateString('de-at')
              : '-'
          ]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Emails
      </Heading>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Primary</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Verified</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {user.data.emails.map((email: any) => (
            <Table.Row key={email.id}>
              <Table.Cell>{email.email}</Table.Cell>
              <Table.Cell>{email.isPrimary ? 'Yes' : 'No'}</Table.Cell>
              <Table.Cell>
                {email.verifiedAt
                  ? new Date(email.verifiedAt).toLocaleDateString('de-at')
                  : 'No'}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Auth Attempts
      </Heading>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>IP</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>UA</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {user.data.authAttempts.map((attempt: any) => (
            <Table.Row key={attempt.id}>
              <Table.Cell>{attempt.id}</Table.Cell>
              <Table.Cell>{attempt.status}</Table.Cell>
              <Table.Cell>{attempt.ip}</Table.Cell>
              <Table.Cell>{attempt.ua}</Table.Cell>
              <Table.Cell>
                {new Date(attempt.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Sessions
      </Heading>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>IP</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>UA</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Device ID</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {user.data.sessions.map((session: any) => (
            <Table.Row key={session.id}>
              <Table.Cell>{session.id}</Table.Cell>
              <Table.Cell>
                {session.loggedOutAt
                  ? 'Logged Out'
                  : new Date(session.expiresAt) > new Date()
                    ? 'Active'
                    : 'Expired'}
              </Table.Cell>
              <Table.Cell>{session.device.ip}</Table.Cell>
              <Table.Cell>{session.device.ua}</Table.Cell>
              <Table.Cell>
                {new Date(session.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
              <Table.Cell>{session.device.id}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </>
  ));
};
