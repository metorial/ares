import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, Flex, Input, showModal, Spacer } from '@metorial/ui';
import { DataList, Heading, Table } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { planCampaignState } from '../../../state';

export let PlanCampaignPage = () => {
  let { planCampaignId } = useParams();
  let campaign = planCampaignState.use({ id: planCampaignId! });
  let campaignOuter = campaign;

  let pending =
    campaign.data?.campaignPlanSubjects.filter(s => s.status == 'pending').length ?? 0;
  let received =
    campaign.data?.campaignPlanSubjects.filter(s => s.status == 'received').length ?? 0;

  return renderWithLoader({ campaign })(({ campaign }) => (
    <>
      <Heading as="h1" size="7">
        {campaign.data.name}
      </Heading>

      <Spacer size={15} />

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', campaign.data.id],
          ['Name', campaign.data.name],
          ['Starts At', campaign.data.startsAt.toLocaleDateString('de-at')],
          ['Ends At', campaign.data.endsAt.toLocaleDateString('de-at')],
          ['Created At', campaign.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', campaign.data.updatedAt.toLocaleDateString('de-at')],
          ['Pending', pending],
          ['Received', received]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Welcome Message
      </Heading>

      <pre>{campaign.data.welcomeMessage}</pre>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Subjects
      </Heading>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {campaign.data.campaignPlanSubjects.map(subject => (
            <Table.Row key={subject.id}>
              <Table.Cell>{subject.email}</Table.Cell>
              <Table.Cell>{subject.status}</Table.Cell>
              <Table.Cell>{subject.type}</Table.Cell>
              <Table.Cell>{subject.createdAt.toLocaleDateString('de-at')}</Table.Cell>
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
              let create = useMutation(campaignOuter.mutators.addSubjects);

              let form = useForm({
                initialValues: {
                  email: ''
                },
                schema: yup =>
                  yup.object({
                    email: yup.string().required('Email is required')
                  }),
                onSubmit: async values => {
                  let [res] = await create.mutate({
                    subjects: values.email
                      .split(/[\s,]+/)
                      .map(e => e.trim())
                      .filter(Boolean)
                      .map(email => ({ type: 'user', email }))
                  });

                  close();
                }
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Add Person</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input
                      label="Emails"
                      {...form.getFieldProps('email')}
                      description="Comma/line separated emails"
                      as="textarea"
                      minRows={10}
                      maxRows={20}
                    />
                    <form.RenderError field="email" />

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
          Add via Email
        </Button>
      </Flex>
    </>
  ));
};
