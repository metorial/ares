import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usersState } from '../../state';

export let UsersPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let users = usersState.use({
    search,
    after
  });

  return renderWithLoader({ users })(({ users }) => (
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
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {users.data.map(user => (
            <Table.Row key={user.id}>
              <Table.Cell>{user.name}</Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>{user.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/users/${user.id}`}>
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
        onClick={() => setAfter(users.data[users.data.length - 1]?.id)}
      >
        Load More
      </Button>
    </>
  ));
};
