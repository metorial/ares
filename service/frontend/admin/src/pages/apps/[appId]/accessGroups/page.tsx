import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { Heading, Table } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import { accessGroupsState } from '../../../../state';
import { adminClient } from '../../../../state/client';

export let AccessGroupsPage = () => {
  let { appId } = useParams();
  let accessGroups = accessGroupsState.use({ appId: appId! });
  let accessGroupRoot = accessGroups;

  return renderWithLoader({ accessGroups })(({ accessGroups }) => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Heading as="h1" size="7">
          Access Groups
        </Heading>

        <Link to={`/apps/${appId}`}>
          <Button as="span" size="1" variant="outline">
            Back to App
          </Button>
        </Link>
      </div>

      <div style={{ marginBottom: 15 }}>
        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let create = useMutation(adminClient.accessGroup.create);

              let form = useForm({
                initialValues: { name: '' },
                onSubmit: async values => {
                  let [res] = await create.mutate({
                    appId: appId!,
                    name: values.name,
                    rules: []
                  });
                  if (res) {
                    close();
                    accessGroupRoot.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    name: yup.string().required('Name is required')
                  }) as any
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Create Access Group</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input label="Name" {...form.getFieldProps('name')} />
                    <form.RenderError field="name" />

                    <Spacer size={15} />

                    <Button
                      type="submit"
                      loading={create.isLoading}
                      success={create.isSuccess}
                    >
                      Create
                    </Button>
                    <create.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Create Access Group
        </Button>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Rules</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {accessGroups.data.map((group: any) => (
            <AccessGroupRow
              key={group.id}
              group={group}
              appId={appId!}
              onUpdate={() => accessGroupRoot.refetch()}
            />
          ))}

          {accessGroups.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={4} style={{ textAlign: 'center', color: '#888' }}>
                No access groups configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </>
  ));
};

let AccessGroupRow = ({
  group,
  appId,
  onUpdate
}: {
  group: any;
  appId: string;
  onUpdate: () => void;
}) => {
  let deleteGroup = useMutation(adminClient.accessGroup.delete);

  return (
    <Table.Row>
      <Table.Cell>{group.name}</Table.Cell>
      <Table.Cell>{group.counts.rules}</Table.Cell>
      <Table.Cell>{new Date(group.createdAt).toLocaleDateString('de-at')}</Table.Cell>
      <Table.Cell>
        <div style={{ display: 'flex', gap: 5 }}>
          <Link to={`/apps/${appId}/access-groups/${group.id}`}>
            <Button as="span" size="1">
              View
            </Button>
          </Link>
          <Button
            size="1"
            variant="outline"
            loading={deleteGroup.isLoading}
            onClick={async () => {
              if (!confirm('Delete this access group?')) return;
              await deleteGroup.mutate({ id: group.id });
              onUpdate();
            }}
          >
            Delete
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  );
};
