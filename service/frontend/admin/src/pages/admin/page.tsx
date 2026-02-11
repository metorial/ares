import { renderWithLoader } from '@metorial-io/data-hooks';
import { Button } from '@metorial-io/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { adminsState } from '../../state';

export let AdminsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let admins = adminsState.use({
    search,
    after
  });

  return renderWithLoader({ admins })(({ admins }) => (
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
        />
      </form>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {admins.data.items.map((admin: any) => (
            <Table.Row key={admin.id}>
              <Table.Cell>{admin.name}</Table.Cell>
              <Table.Cell>{admin.email}</Table.Cell>
              <Table.Cell>
                {new Date(admin.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {admins.data.items.length > 0 && (
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(admins.data.items[admins.data.items.length - 1]?.id)}
        >
          Load More
        </Button>
      )}
    </>
  ));
};
