import { renderWithLoader } from '@metorial-io/data-hooks';
import { Badge, Heading, Table } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { Button } from '@metorial-io/ui';
import { globalSsoTenantsState } from '../../state';

export let SettingsPage = () => {
  let globalSsoTenants = globalSsoTenantsState.use();

  return renderWithLoader({ globalSsoTenants })(({ globalSsoTenants }) => (
    <>
      <Heading as="h1" size="7">
        Settings
      </Heading>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Global SSO Tenants
      </Heading>

      <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        Global SSO tenants are available as authentication options on all apps.
      </p>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Owning App</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Connections</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {globalSsoTenants.data.map((tenant: any) => (
            <Table.Row key={tenant.id}>
              <Table.Cell>
                {tenant.name}
                <Badge color="blue" style={{ marginLeft: 8 }}>Global</Badge>
              </Table.Cell>
              <Table.Cell>{tenant.status}</Table.Cell>
              <Table.Cell>{tenant.app.clientId}</Table.Cell>
              <Table.Cell>{tenant.counts.connections}</Table.Cell>
              <Table.Cell>{new Date(tenant.createdAt).toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/apps/${tenant.app.id}/sso/${tenant.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}

          {globalSsoTenants.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6} style={{ textAlign: 'center', color: '#888' }}>
                No global SSO tenants configured. Mark an SSO tenant as global from its detail page.
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </>
  ));
};
