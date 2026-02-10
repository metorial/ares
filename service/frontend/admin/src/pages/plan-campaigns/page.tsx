import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, DatePicker, Dialog, Input, Select, showModal, Spacer } from '@metorial/ui';
import { Table } from '@radix-ui/themes';
import { Link, useNavigate } from 'react-router-dom';
import { planCampaignsState, plansState } from '../../state';

export let PlanCampaignsPage = () => {
  let campaigns = planCampaignsState.use({});

  return renderWithLoader({ campaigns })(({ campaigns }) => (
    <>
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Starts At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Ends At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {campaigns.data.map(campaign => (
            <Table.Row key={campaign.id}>
              <Table.Cell>{campaign.name}</Table.Cell>
              <Table.Cell>{campaign.startsAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>{campaign.endsAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>{campaign.createdAt.toLocaleDateString('de-at')}</Table.Cell>
              <Table.Cell>
                <Link to={`/plan-campaigns/${campaign.id}`}>
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
        <Button size="1" onClick={() => showCreatePlanCampaign()}>
          Create Plan Campaign
        </Button>
      </div>
    </>
  ));
};

export let showCreatePlanCampaign = async () =>
  showModal(({ dialogProps, close }) => {
    let campaigns = planCampaignsState.use({});
    let plans = plansState.use({});

    let create = useMutation(campaigns.mutators.create);
    let navigate = useNavigate();

    let form = useForm({
      initialValues: {
        name: '',
        planId: '',
        welcomeMessage: '',
        endsAt: new Date(),
        startsAt: new Date()
      },
      schema: yup =>
        yup.object({
          name: yup.string().required('Name is required'),
          planId: yup.string().required('Plan is required'),
          endsAt: yup.date().required('End date is required'),
          startsAt: yup.date().required('Start date is required'),
          welcomeMessage: yup.string().required('Welcome message is required')
        }),
      onSubmit: async values => {
        let [res] = await create.mutate({
          name: values.name,
          planId: values.planId,
          endsAt: values.endsAt,
          startsAt: values.startsAt,
          welcomeMessage: values.welcomeMessage
        });

        if (res) {
          close();
          navigate(`/plan-campaigns/${res.id}`);
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

          <Select
            items={
              plans.data?.map(plan => ({
                label: plan.name,
                id: plan.id
              })) ?? []
            }
            label="Plan"
            value={form.values.planId}
            onChange={planId => form.setFieldValue('planId', planId)}
          />
          <form.RenderError field="planId" />

          <Spacer size={15} />

          <DatePicker
            label="Starts At"
            type="single"
            value={form.values.startsAt}
            onChange={date => form.setFieldValue('startsAt', date)}
          />
          <form.RenderError field="startsAt" />

          <Spacer size={15} />

          <DatePicker
            label="Ends At"
            type="single"
            value={form.values.endsAt}
            onChange={date => form.setFieldValue('endsAt', date)}
          />
          <form.RenderError field="endsAt" />

          <Spacer size={15} />

          <Input
            label="Welcome Message"
            {...form.getFieldProps('welcomeMessage')}
            as="textarea"
            minRows={6}
          />
          <form.RenderError field="welcomeMessage" />

          <Spacer size={30} />

          <Button type="submit" size="2" loading={create.isLoading} success={create.isSuccess}>
            Create
          </Button>
        </form>
      </Dialog.Wrapper>
    );
  });
