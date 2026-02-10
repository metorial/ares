import { renderWithLoader, useForm } from '@metorial/data-hooks';
import { Button, Dialog, Flex, Input, showModal, Spacer, TextArrayInput } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { handoffApplicationsState } from '../../state';

export let HandoffPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let applications = handoffApplicationsState.use({
    search,
    after
  });
  let applicationsOuter = applications;

  return renderWithLoader({ applications })(({ applications }) => (
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
            <Table.ColumnHeaderCell>Client ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {applications.data.map(application => (
            <Table.Row key={application.id}>
              <Table.Cell>{application.name}</Table.Cell>
              <Table.Cell>{application.clientId}</Table.Cell>
              <Table.Cell>{application.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/handoff/${application.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Flex gap="10px" align="center">
        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() => setAfter(applications.data[applications.data.length - 1]?.id)}
        >
          Load More
        </Button>

        <Button
          size="1"
          style={{ marginTop: 20 }}
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let createApplication = applicationsOuter.useMutator('create')();

              let form = useForm({
                initialValues: {
                  name: '',
                  redirectUris: []
                },
                schema: yup =>
                  yup.object({
                    name: yup.string().required(),
                    redirectUris: yup.array().of(yup.string().url().required()).required()
                  }),
                onSubmit: async values => {
                  await createApplication.mutate(values);
                  close();
                }
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Create Handoff Application</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input label="Name" {...form.getFieldProps('name')} />
                    <form.RenderError field="name" />

                    <Spacer size={15} />

                    <TextArrayInput
                      value={form.values.redirectUris}
                      onChange={val => form.setFieldValue('redirectUris', val)}
                      label="Redirect URIs"
                      description="List of allowed redirect URIs for this application"
                    />
                    <form.RenderError field="redirectUris" />

                    <Spacer size={15} />

                    <Button
                      type="submit"
                      loading={createApplication.isLoading}
                      success={createApplication.isSuccess}
                    >
                      Create
                    </Button>
                    <createApplication.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Create Handoff Application
        </Button>
      </Flex>
    </>
  ));
};
