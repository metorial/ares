import { renderWithLoader, useMutation } from '@metorial-io/data-hooks';
import { Button, Spacer } from '@metorial-io/ui';
import { DataList, Heading, Switch, Table, Text } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { ssoConnectionsState, ssoTenantState } from '../../../../../state';
import { adminClient } from '../../../../../state/client';

export let SsoTenantPage = () => {
  let { appId, ssoTenantId } = useParams();
  let ssoTenant = ssoTenantState.use({ id: ssoTenantId! });
  let ssoTenantRoot = ssoTenant;
  let connections = ssoConnectionsState.use({ tenantId: ssoTenantId! });
  let createSetup = useMutation(adminClient.sso.createSetup);
  let setGlobal = useMutation(adminClient.sso.setGlobal);

  return renderWithLoader({ ssoTenant, connections })(({ ssoTenant, connections }) => (
    <>
      <Heading as="h1" size="7">
        {ssoTenant.data.name}
      </Heading>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        SSO Tenant Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', ssoTenant.data.id],
          ['Name', ssoTenant.data.name],
          ['Status', ssoTenant.data.status],
          ['Client ID', ssoTenant.data.clientId],
          ['External ID', ssoTenant.data.externalId ?? '-'],
          ['Created At', new Date(ssoTenant.data.createdAt).toLocaleDateString('de-at')],
          ['Updated At', new Date(ssoTenant.data.updatedAt).toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        <Heading as="h2" size="4">
          Global SSO
        </Heading>
      </div>

      <Text as="label" size="2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Switch
          checked={ssoTenant.data.isGlobal}
          disabled={setGlobal.isLoading}
          onCheckedChange={async checked => {
            let [res] = await setGlobal.mutate({ id: ssoTenantId!, isGlobal: checked });
            if (res) ssoTenantRoot.refetch();
          }}
        />
        Available on all apps
      </Text>
      <setGlobal.RenderError />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        <Heading as="h2" size="4">
          Connections
        </Heading>

        <Button
          size="1"
          loading={createSetup.isLoading}
          onClick={async () => {
            let [res] = await createSetup.mutate({
              tenantId: ssoTenantId!,
              appId: appId!
            });
            if (res) {
              window.open(res.setupUrl, '_blank');
            }
          }}
        >
          Add Connection
        </Button>
      </div>

      <createSetup.RenderError />

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Provider Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Provider Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {connections.data.map((connection: any) => (
            <Table.Row key={connection.id}>
              <Table.Cell>{connection.name}</Table.Cell>
              <Table.Cell>{connection.providerType}</Table.Cell>
              <Table.Cell>{connection.providerName ?? '-'}</Table.Cell>
              <Table.Cell>
                {new Date(connection.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
            </Table.Row>
          ))}

          {connections.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={4} style={{ textAlign: 'center', color: '#888' }}>
                No connections configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <Spacer size={10} />
    </>
  ));
};
