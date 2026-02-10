import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { organizationsState } from '../../state';

export let OrganizationsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let organizations = organizationsState.use({
    search,
    after
  });

  return renderWithLoader({ organizations })(({ organizations }) => (
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
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {organizations.data.map(org => (
            <Table.Row key={org.id}>
              <Table.Cell>{org.name}</Table.Cell>
              <Table.Cell>{org.slug}</Table.Cell>
              <Table.Cell>{org.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/organizations/${org.id}`}>
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
        onClick={() => setAfter(organizations.data[organizations.data.length - 1]?.id)}
      >
        Load More
      </Button>
    </>
  ));
};
