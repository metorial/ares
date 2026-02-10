import { renderWithLoader } from '@metorial-io/data-hooks';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { tenantState } from '../../../state';

export let TenantPage = () => {
  let { tenantId } = useParams();
  let tenant = tenantState.use({ id: tenantId! });

  return renderWithLoader({ tenant })(({ tenant }) => (
    <>
      <Heading as="h1" size="7">
        {tenant.data.clientId}
      </Heading>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Tenant Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', tenant.data.id],
          ['Client ID', tenant.data.clientId],
          ['App ID', tenant.data.appId ?? '-'],
          ['Users', tenant.data.counts.users],
          ['Created At', new Date(tenant.data.createdAt).toLocaleDateString('de-at')],
          ['Updated At', new Date(tenant.data.updatedAt).toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>
    </>
  ));
};
