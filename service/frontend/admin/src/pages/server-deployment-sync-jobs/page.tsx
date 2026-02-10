import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table } from '@radix-ui/themes';
import { indexServerDeployments, listServerDeploymentIndexJobsState } from '../../state';

export let ServerDeploymentSyncsPage = () => {
  let serverSyncs = listServerDeploymentIndexJobsState.use({});

  return renderWithLoader({ serverSyncs })(({ serverSyncs }) => (
    <>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Started At</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {serverSyncs.data.map(serverSync => (
            <Table.Row key={serverSync.oid}>
              <Table.Cell>{serverSync.oid}</Table.Cell>
              <Table.Cell>{serverSync.status}</Table.Cell>
              <Table.Cell>{serverSync.type}</Table.Cell>
              <Table.Cell>{serverSync.createdAt.toLocaleDateString('de-at')}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={async () => {
            if (
              confirm(
                'Are you really sure you want to sync server deployment and implementations?'
              )
            ) {
              await indexServerDeployments();
            }
          }}
        >
          Start Server Sync
        </Button>
      </div>
    </>
  ));
};
