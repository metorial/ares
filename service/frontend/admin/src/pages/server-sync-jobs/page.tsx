import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table } from '@radix-ui/themes';
import { manuallyStartServerSync, serverSyncJobsState } from '../../state';

export let ServerSyncsPage = () => {
  let serverSyncs = serverSyncJobsState.use({});

  return renderWithLoader({ serverSyncs })(({ serverSyncs }) => (
    <>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Started At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Finished At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Categories</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Providers</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Repos</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Servers</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Vendors</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {serverSyncs.data.map(serverSync => (
            <Table.Row key={serverSync.oid}>
              <Table.Cell>{serverSync.oid}</Table.Cell>
              <Table.Cell>{serverSync.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>{serverSync.finishedAt?.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>{serverSync.importedCategoriesCount}</Table.Cell>
              <Table.Cell>{serverSync.importedProvidersCount}</Table.Cell>
              <Table.Cell>{serverSync.importedReposCount}</Table.Cell>
              <Table.Cell>{serverSync.importedSeversCount}</Table.Cell>
              <Table.Cell>{serverSync.importedVendorsCount}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={async () => {
            if (confirm('Are you really sure you want to sync servers?')) {
              await manuallyStartServerSync();
            }
          }}
        >
          Start Server Sync
        </Button>
      </div>
    </>
  ));
};
