import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appsState } from '../../state';
import { adminClient } from '../../state/client';

export let AppsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();
  let navigate = useNavigate();

  let apps = appsState.use({ search, after });

  return renderWithLoader({ apps })(({ apps }) => (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <form
          style={{ flex: 1 }}
          onSubmit={e => {
            e.preventDefault();
            let formData = new FormData(e.target as HTMLFormElement);
            setSearch(formData.get('search') as string);
          }}
        >
          <TextField.Root placeholder="Search" name="search" defaultValue={search} />
        </form>

        <Button
          size="2"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let create = useMutation(adminClient.app.create);

              let form = useForm({
                initialValues: {
                  defaultRedirectUrl: ''
                },
                onSubmit: async values => {
                  let [res] = await create.mutate(values);
                  if (res) {
                    close();
                    navigate(`/apps/${res.id}`);
                  }
                },
                schema: yup =>
                  yup.object({
                    defaultRedirectUrl: yup.string().url().required()
                  })
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Create App</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input
                      label="Default Redirect URL"
                      {...form.getFieldProps('defaultRedirectUrl')}
                    />
                    <form.RenderError field="defaultRedirectUrl" />

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
          Create App
        </Button>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Client ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Users</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Tenants</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {apps.data.map((app: any) => (
            <Table.Row key={app.id}>
              <Table.Cell>{app.clientId}</Table.Cell>
              <Table.Cell>{app.counts.users}</Table.Cell>
              <Table.Cell>{app.counts.tenants}</Table.Cell>
              <Table.Cell>
                {new Date(app.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
              <Table.Cell>
                <Link to={`/apps/${app.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {apps.data.length > 0 && (
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(apps.data[apps.data.length - 1]?.id)}
        >
          Load More
        </Button>
      )}
    </>
  ));
};
