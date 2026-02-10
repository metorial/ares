import { renderWithLoader } from '@metorial-io/data-hooks';
import { Button } from '@metorial-io/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { appsState } from '../../state';

export let AppsPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let apps = appsState.use({ search, after });

  return renderWithLoader({ apps })(({ apps }) => (
    <>
      <form
        style={{ marginBottom: 20 }}
        onSubmit={e => {
          e.preventDefault();
          let formData = new FormData(e.target as HTMLFormElement);
          setSearch(formData.get('search') as string);
        }}
      >
        <TextField.Root placeholder="Search" name="search" defaultValue={search} />
      </form>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Client ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Users</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Tenants</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {apps.data.map((app: any) => (
            <Table.Row key={app.id}>
              <Table.Cell>{app.slug}</Table.Cell>
              <Table.Cell>{app.clientId}</Table.Cell>
              <Table.Cell>{app.counts.users}</Table.Cell>
              <Table.Cell>{app.counts.tenants}</Table.Cell>
              <Table.Cell>
                {new Date(app.createdAt).toLocaleDateString('de-at')}
              </Table.Cell>
              <Table.Cell>
                <Link to={`/apps/${app.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {apps.data.length > 0 && (
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(apps.data[apps.data.length - 1]?.id)}
        >
          Load More
        </Button>
      )}
    </>
  ));
};
