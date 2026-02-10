import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, Flex, Input, showModal, Spacer, toast } from '@metorial/ui';
import { DataList, Heading, Table } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import { companyState } from '../../../state';

export let CompanyPage = () => {
  let { companyId } = useParams();
  let company = companyState.use({ id: companyId! });
  let createOnboarding = useMutation(company.mutators.createOnboarding);
  let sendCompanySlackInvite = useMutation(company.mutators.sendCompanySlackInvite);
  let onboardSelfHosted = useMutation(company.mutators.onboardSelfHosted);

  return renderWithLoader({ company })(({ company }) => (
    <>
      <Heading as="h1" size="7">
        {company.data.name}
      </Heading>

      <Spacer size={15} />

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Company Profile
      </Heading>

      <DataList.Root>
        {[
          ['ID', company.data.id],
          ['Slug', company.data.slug],
          ['Name', company.data.name],
          ['Created At', company.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', company.data.updatedAt.toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        People
      </Heading>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {company.data.people.map(person => (
            <Table.Row key={person.id}>
              <Table.Cell>{person.name}</Table.Cell>
              <Table.Cell>{person.email}</Table.Cell>
              <Table.Cell>{person.createdAt.toLocaleDateString('de-at')}</Table.Cell>

              <Table.Cell>
                <Button
                  size="1"
                  disabled={createOnboarding.isLoading}
                  loading={
                    createOnboarding.isLoading &&
                    createOnboarding.input?.personId === person.id
                  }
                  success={
                    createOnboarding.isSuccess &&
                    createOnboarding.input?.personId === person.id
                  }
                  onClick={async () => {
                    let [res] = await createOnboarding.mutate({
                      companyId: company.data.id,
                      personId: person.id
                    });

                    if (res) {
                      toast.success('Onboarding created and email sent to the person');
                    }
                  }}
                >
                  Send Onboarding Email
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Spacer size={20} />

      <Flex align="center" gap="10px">
        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let create = useMutation(company.mutators.addPerson);

              let form = useForm({
                initialValues: {
                  email: '',
                  firstName: '',
                  lastName: ''
                },
                schema: yup =>
                  yup.object({
                    email: yup.string().email('Invalid email').required('Email is required'),
                    firstName: yup.string().required('First name is required'),
                    lastName: yup.string().required('Last name is required')
                  }),
                onSubmit: async values => {
                  let [res] = await create.mutate({
                    companyId: company.data.id,
                    email: values.email,
                    firstName: values.firstName,
                    lastName: values.lastName
                  });

                  if (res) close();
                }
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Add Person</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input label="Email" {...form.getFieldProps('email')} />
                    <form.RenderError field="email" />

                    <Spacer size={15} />

                    <Input label="First Name" {...form.getFieldProps('firstName')} />
                    <form.RenderError field="firstName" />

                    <Spacer size={15} />

                    <Input label="Last Name" {...form.getFieldProps('lastName')} />
                    <form.RenderError field="lastName" />

                    <Spacer size={30} />

                    <Button
                      type="submit"
                      size="2"
                      loading={create.isLoading}
                      success={create.isSuccess}
                    >
                      Create
                    </Button>
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Add Person
        </Button>

        <Button
          size="1"
          onClick={async () => {
            let [res] = await sendCompanySlackInvite.mutate({
              companyId: company.data.id
            });
            if (res) toast.success('Company invited to Slack');
          }}
        >
          Invite to Slack
        </Button>

        <Button
          size="1"
          onClick={async () => {
            let [res] = await onboardSelfHosted.mutate({
              companyId: company.data.id
            });
            if (res) {
              toast.success('Self-hosted onboarding initiated');
              let win = window.open('https://licenses.metorial.com/admin', '_blank');
              win?.focus();
            }
          }}
        >
          Onboard Self-Hosted
        </Button>

        <Link
          to={
            company.data.enterpriseAccount
              ? `/organizations/${company.data.enterpriseAccount?.defaultOrganization.id}`
              : '#'
          }
        >
          <Button
            size="1"
            disabled={!!company.data.enterpriseAccount?.defaultOrganization}
            as="span"
          >
            Open Organization
          </Button>
        </Link>
      </Flex>
    </>
  ));
};
