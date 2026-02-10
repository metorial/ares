import { renderWithLoader } from '@metorial/data-hooks';
import { Button } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { profilesState } from '../../state';

export let ProfilesPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let profiles = profilesState.use({
    search,
    after
  });

  return renderWithLoader({ profiles })(({ profiles }) => (
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
          {profiles.data.map(profile => (
            <Table.Row key={profile.id}>
              <Table.Cell>{profile.name}</Table.Cell>
              <Table.Cell>{profile.slug}</Table.Cell>
              <Table.Cell>{profile.type}</Table.Cell>
              <Table.Cell>{profile.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/profiles/${profile.id}`}>
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
        onClick={() => setAfter(profiles.data[profiles.data.length - 1]?.id)}
      >
        Load More
      </Button>
    </>
  ));
};
