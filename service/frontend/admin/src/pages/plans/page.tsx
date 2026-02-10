import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, Input, showModal, Spacer, Text } from '@metorial/ui';
import { Table } from '@radix-ui/themes';
import { featuresState, metersState, plansState } from '../../state';

export let PlansPage = () => {
  let plans = plansState.use({});

  return renderWithLoader({ plans })(({ plans }) => (
    <>
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
          {plans.data.map(invite => (
            <Table.Row key={invite.id}>
              <Table.Cell>{invite.name}</Table.Cell>
              <Table.Cell>{invite.slug}</Table.Cell>
              <Table.Cell>{invite.type}</Table.Cell>
              <Table.Cell>{invite.createdAt.toLocaleDateString('de-at')}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <Spacer size={20} />
    </>
  ));
};

export let showCreateCustomPlanModal = (d: {
  organization: {
    id: string;
    name: string;
  };
  onPlanCreated: (d: { planId: string }) => void;
}) =>
  showModal(({ dialogProps, close }) => {
    let plans = plansState.use({ organizationId: d.organization.id });
    let meters = metersState.use({});
    let features = featuresState.use({});

    let create = useMutation(plans.mutators.createCustomPlan);

    let form = useForm({
      initialValues: {
        name: d.organization.name,
        description: '' as string | undefined,
        unitAmountInCents: 0,
        features: {
          organization_member_count: '15',
          project_count: '100',
          project_instance_count: '50'
        } as Record<string, string>,
        meters: {
          session_count: '10000000',
          server_run_count: '100000000',
          productive_mcp_message_count: '300000',
          server_deployment_count: '10000000',
          server_implementation_count: '10000000',
          file_count: '100000000',
          file_size_bytes: '1000000000'
        } as Record<string, string>
      },
      onSubmit: async values => {
        let [plan] = await create.mutate({
          organizationId: d.organization.id,
          name: values.name,
          description: values.description ?? undefined,
          unitAmountInCents: values.unitAmountInCents,
          currency: 'USD',
          interval: 'month',
          features: Object.entries(values.features).map(([slug, value]) => ({
            slug,
            value
          })),
          meters: Object.entries(values.meters).map(([slug, includedAmount]) => ({
            slug,
            includedAmount: Number(includedAmount)
          }))
        });
        if (plan) {
          d.onPlanCreated({ planId: plan.id });
          close();
        }
      },
      schema: yup =>
        yup.object({
          name: yup.string().required(),
          description: yup.string(),
          unitAmountInCents: yup.number().required(),
          features: yup.object().required(),
          meters: yup.object().required()
        })
    });

    return (
      <Dialog.Wrapper {...dialogProps}>
        <Dialog.Title>Create Plan</Dialog.Title>

        <form onSubmit={form.handleSubmit}>
          <Input label="Name" {...form.getFieldProps('name')} type="name" />
          <form.RenderError field="name" />

          <Spacer size={15} />

          <Input
            label="Description"
            {...form.getFieldProps('description')}
            type="description"
          />
          <form.RenderError field="description" />

          <Spacer size={15} />

          <Input
            label="Unit Amount (in cents)"
            {...form.getFieldProps('unitAmountInCents')}
            type="number"
          />
          <form.RenderError field="unitAmountInCents" />

          <Spacer size={15} />

          <Text>Features</Text>
          {Object.values(features.data ?? []).map(feature => (
            <>
              <Input
                label={`Feature: ${feature.name}`}
                {...form.getFieldProps(`features.${feature.slug}`)}
                type="text"
              />
              <Spacer size={5} />
            </>
          ))}

          <Spacer size={15} />

          <Text>Features</Text>

          {Object.values(meters.data ?? []).map(meter => (
            <>
              <Input
                label={`Meter: ${meter.name}`}
                {...form.getFieldProps(`meters.${meter.slug}`)}
                type="number"
              />
              <Spacer size={5} />
            </>
          ))}

          <Spacer size={15} />

          <Button type="submit" loading={create.isLoading} success={create.isSuccess}>
            Create Plan
          </Button>
        </form>
      </Dialog.Wrapper>
    );
  });
