import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { DataList, Heading, Table } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import { appState, ssoTenantsState } from '../../../state';
import { adminClient } from '../../../state/client';

export let AppPage = () => {
  let { appId } = useParams();
  let app = appState.use({ id: appId! });
  let ssoTenants = ssoTenantsState.use({ appId: appId! });

  return renderWithLoader({ app, ssoTenants })(({ app, ssoTenants }) => (
    <>
      <Heading as="h1" size="7">
        {app.data.clientId}
      </Heading>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        App Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', app.data.id],
          ['Client ID', app.data.clientId],
          ['Slug', app.data.slug ?? '-'],
          ['Has Terms', app.data.hasTerms ? 'Yes' : 'No'],
          ['Default Redirect URL', app.data.defaultRedirectUrl ?? '-'],
          ['Default Tenant', app.data.defaultTenant?.clientId ?? '-'],
          ['Users', app.data.counts.users],
          ['Tenants', app.data.counts.tenants],
          ['Created At', new Date(app.data.createdAt).toLocaleDateString('de-at')],
          ['Updated At', new Date(app.data.updatedAt).toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
        <Heading as="h2" size="4">
          SSO Tenants
        </Heading>

        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let create = useMutation(adminClient.sso.createTenant);

              let form = useForm({
                initialValues: { name: '' },
                onSubmit: async values => {
                  let [res] = await create.mutate({
                    appId: appId!,
                    name: values.name
                  });
                  if (res) {
                    close();
                    ssoTenants.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    name: yup.string().required('Name is required')
                  }) as any
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Create SSO Tenant</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input label="Name" {...form.getFieldProps('name')} />
                    <form.RenderError field="name" />

                    <Spacer size={15} />

                    <Button type="submit" loading={create.isLoading} success={create.isSuccess}>
                      Create
                    </Button>
                    <create.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Create SSO Tenant
        </Button>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Connections</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {ssoTenants.data.map((tenant: any) => (
            <Table.Row key={tenant.id}>
              <Table.Cell>{tenant.name}</Table.Cell>
              <Table.Cell>{tenant.status}</Table.Cell>
              <Table.Cell>{tenant.counts.connections}</Table.Cell>
              <Table.Cell>{new Date(tenant.createdAt).toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/apps/${appId}/sso/${tenant.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}

          {ssoTenants.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                No SSO tenants configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </>
  ));
};
