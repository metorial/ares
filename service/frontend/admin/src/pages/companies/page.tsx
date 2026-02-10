import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial/ui';
import { Table, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { companiesState } from '../../state';

export let CompaniesPage = () => {
  let [after, setAfter] = useState<string | undefined>();
  let [search, setSearch] = useState<string | undefined>();

  let companies = companiesState.use({
    search,
    after
  });

  return renderWithLoader({ companies })(({ companies }) => (
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
          {companies.data.map(company => (
            <Table.Row key={company.id}>
              <Table.Cell>{company.name}</Table.Cell>
              <Table.Cell>{company.slug}</Table.Cell>
              <Table.Cell>{company.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/companies/${company.id}`}>
                  <Button as="span" size="1">
                    View
                  </Button>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Spacer size={15} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <Button
          size="1"
          onClick={() => setAfter(companies.data[companies.data.length - 1]?.id)}
        >
          Load More
        </Button>

        <Button size="1" onClick={() => showCreateCompanyModal()}>
          Create Company
        </Button>
      </div>
    </>
  ));
};

export let showCreateCompanyModal = async (d?: {
  onComplete: (company: { id: string }) => any;
}) =>
  showModal(({ dialogProps, close }) => {
    let companies = companiesState.use({});
    let create = useMutation(companies.mutators.create);
    let navigate = useNavigate();

    let form = useForm({
      initialValues: {
        name: '',
        domain: ''
      },
      schema: yup =>
        yup.object({
          name: yup.string().required('Name is required'),
          domain: yup.string().required('Domain is required')
        }),
      onSubmit: async values => {
        let [res] = await create.mutate({
          name: values.name,
          domain: values.domain
        });

        if (res) {
          close();
          if (d?.onComplete) d.onComplete(res);
          else navigate(`/companies/${res.id}`);
        }
      }
    });

    return (
      <Dialog.Wrapper {...dialogProps}>
        <Dialog.Title>Create Company</Dialog.Title>

        <form onSubmit={form.handleSubmit}>
          <Input label="Name" {...form.getFieldProps('name')} />
          <form.RenderError field="name" />

          <Spacer size={15} />

          <Input label="Domain" {...form.getFieldProps('domain')} />
          <form.RenderError field="domain" />

          <Spacer size={30} />

          <Button type="submit" size="2" loading={create.isLoading} success={create.isSuccess}>
            Create
          </Button>
        </form>
      </Dialog.Wrapper>
    );
  });
