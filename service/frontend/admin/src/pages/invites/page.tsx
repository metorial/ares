import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { invitesState } from '../../state';

export let InvitesPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let invites = invitesState.use({
    search,
    after
  });

  return renderWithLoader({ invites })(({ invites }) => (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 15,
          marginBottom: 20
        }}
      >
        <form
          style={{ flex: 1 }}
          onSubmit={e => {
            e.preventDefault();
            let formData = new FormData(e.target as HTMLFormElement);
            let search = formData.get('search') as string;
            setSearch(search);
          }}
        >
          <TextField.Root placeholder="Search" name="search" defaultValue={search} />
        </form>

        <Button
          size="2"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let create = useMutation(invites.mutators.create);

              let form = useForm({
                initialValues: {
                  email: '',
                  title: 'Your Metorial Invite',
                  message: `You have been invited to join Metorial. We're so excited to have you on board! Click the button below to get started.`
                },
                onSubmit: async values => {
                  let [res] = await create.mutate(values);
                  if (res) close();
                },
                schema: yup =>
                  yup.object({
                    email: yup.string().email().required(),
                    title: yup.string().required(),
                    message: yup.string().required()
                  })
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Create Invite</Dialog.Title>

                  <form {...dialogProps} onSubmit={form.handleSubmit}>
                    <Input label="Email" {...form.getFieldProps('email')} />
                    <form.RenderError field="email" />

                    <Spacer size={15} />

                    <Input label="Title" {...form.getFieldProps('title')} />
                    <form.RenderError field="title" />

                    <Spacer size={15} />

                    <Input
                      label="Message"
                      as="textarea"
                      minRows={7}
                      {...form.getFieldProps('message')}
                    />
                    <form.RenderError field="message" />

                    <Spacer size={15} />

                    <Button
                      type="submit"
                      loading={create.isLoading}
                      success={create.isSuccess}
                    >
                      Create
                    </Button>
                    <create.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Create Invite
        </Button>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {invites.data.map(invite => (
            <Table.Row key={invite.id}>
              <Table.Cell>{invite.status}</Table.Cell>
              <Table.Cell>{invite.email}</Table.Cell>
              <Table.Cell>{invite.createdAt.toLocaleDateString('de-at')}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Button
        size="1"
        style={{ marginTop: 20 }}
        onClick={() => setAfter(invites.data[invites.data.length - 1]?.id)}
      >
        Load More
      </Button>
    </>
  ));
};
