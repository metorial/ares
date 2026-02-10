import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { serverCollectionsState } from '../../state';

export let ServerCollectionsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let serverCollections = serverCollectionsState.use({
    search,
    after
  });

  return renderWithLoader({ serverCollections })(({ serverCollections }) => (
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
          {serverCollections.data.map(serverCollection => (
            <Table.Row key={serverCollection.id}>
              <Table.Cell>{serverCollection.name}</Table.Cell>
              <Table.Cell>{serverCollection.slug}</Table.Cell>
              <Table.Cell>{serverCollection.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/server-collections/${serverCollection.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Button
        size="1"
        style={{ marginTop: 20 }}
        onClick={() => setAfter(serverCollections.data[serverCollections.data.length - 1]?.id)}
      >
        Load More
      </Button>
    </>
  ));
};
