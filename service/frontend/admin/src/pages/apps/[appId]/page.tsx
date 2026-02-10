import { renderWithLoader } from '@metorial-io/data-hooks';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { appState } from '../../../state';

export let AppPage = () => {
  let { appId } = useParams();
  let app = appState.use({ id: appId! });

  return renderWithLoader({ app })(({ app }) => (
    <>
      <Heading as="h1" size="7">
        {app.data.slug}
      </Heading>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        App Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', app.data.id],
          ['Client ID', app.data.clientId],
          ['Slug', app.data.slug],
          ['Has Terms', app.data.hasTerms ? 'Yes' : 'No'],
          ['Default Redirect URL', app.data.defaultRedirectUrl ?? '-'],
          ['Default Tenant', app.data.defaultTenant?.slug ?? '-'],
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
    </>
  ));
};
