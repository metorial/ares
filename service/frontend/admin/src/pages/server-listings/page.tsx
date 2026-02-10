import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manuallyStartServerSync, serverListingsState } from '../../state';

export let ServerListingsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let serverListings = serverListingsState.use({
    search,
    after
  });

  return renderWithLoader({ serverListings })(({ serverListings }) => (
    <>
      <form
        style={{ marginBottom: 20 }}
        onSubmit={e => {
          e.preventDefault();
          let formData = new FormData(e.target as HTMLFormElement);
          let search = formData.get('search') as string;
          setSearch(search);
        }}
      >
        <TextField.Root
          placeholder="Search"
          name="search"
          defaultValue={search}
        ></TextField.Root>
      </form>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {serverListings.data.map(serverListing => (
            <Table.Row key={serverListing.id}>
              <Table.Cell>{serverListing.name}</Table.Cell>
              <Table.Cell>{serverListing.slug}</Table.Cell>
              <Table.Cell>
                {serverListing.ownerOrganizationOid ? 'Custom' : 'Imported'}
              </Table.Cell>
              <Table.Cell>{serverListing.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/server-listings/${serverListing.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(serverListings.data[serverListings.data.length - 1]?.id)}
        >
          Load More
        </Button>

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
