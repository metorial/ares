import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { Heading, Select, Table } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import { accessGroupState, appSurfacesState } from '../../../../../state';
import { adminClient } from '../../../../../state/client';

let RULE_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'email_domain', label: 'Email Domain' },
  { value: 'sso_tenant', label: 'SSO Tenant' },
  { value: 'sso_group', label: 'SSO Group' },
  { value: 'sso_role', label: 'SSO Role' }
];

let ruleTypeLabel = (type: string) => RULE_TYPES.find(t => t.value === type)?.label ?? type;

export let AccessGroupPage = () => {
  let { appId, accessGroupId } = useParams();
  let accessGroup = accessGroupState.use({ id: accessGroupId! });
  let surfaces = appSurfacesState.use({ appId: appId! });

  return renderWithLoader({ accessGroup, surfaces })(({ accessGroup, surfaces }) => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Heading as="h1" size="7">
          {accessGroup.data.name}
        </Heading>

        <Link to={`/apps/${appId}/access-groups`}>
          <Button as="span" size="1" variant="outline">
            Back to Access Groups
          </Button>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 10 }}>
        <Heading as="h2" size="4">
          Rules
        </Heading>

        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let update = useMutation(adminClient.accessGroup.update);

              let form = useForm({
                initialValues: {
                  type: 'email' as string,
                  value: ''
                },
                onSubmit: async values => {
                  let existingRules = (accessGroup.data.rules ?? []).map((r: any) => ({
                    type: r.type,
                    value: r.value
                  }));

                  let [res] = await update.mutate({
                    id: accessGroupId!,
                    rules: [...existingRules, { type: values.type, value: values.value }]
                  });
                  if (res) {
                    close();
                    accessGroup.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    type: yup.string().required('Type is required'),
                    value: yup.string().required('Value is required')
                  }) as any
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Add Rule</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                        Type
                      </label>
                      <Select.Root
                        value={form.values.type}
                        onValueChange={val => form.setFieldValue('type', val)}
                      >
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content>
                          {RULE_TYPES.map(rt => (
                            <Select.Item key={rt.value} value={rt.value}>
                              {rt.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    </div>

                    <Input label="Value" {...form.getFieldProps('value')} />
                    <form.RenderError field="value" />

                    <Spacer size={15} />

                    <Button type="submit" loading={update.isLoading} success={update.isSuccess}>
                      Add Rule
                    </Button>
                    <update.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Add Rule
        </Button>
      </div>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {(accessGroup.data.rules ?? []).map((rule: any) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              accessGroupId={accessGroupId!}
              allRules={accessGroup.data.rules}
              onUpdate={() => accessGroup.refetch()}
            />
          ))}

          {(!accessGroup.data.rules || accessGroup.data.rules.length === 0) && (
            <Table.Row>
              <Table.Cell colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                No rules configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
        <Heading as="h2" size="4">
          Assignments
        </Heading>

        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let assignApp = useMutation(adminClient.accessGroup.assignToApp);
              let assignSurface = useMutation(adminClient.accessGroup.assignToSurface);

              let existingAssignments = accessGroup.data.assignments ?? [];
              let isAppAssigned = existingAssignments.some(
                (a: any) => a.target?.type === 'app' && a.target.id === accessGroup.data.id
              );

              let assignedSurfaceIds = new Set(
                existingAssignments
                  .filter((a: any) => a.target?.type === 'surface')
                  .map((a: any) => a.target.id)
              );
              let availableSurfaces = surfaces.data.filter(
                (s: any) => !assignedSurfaceIds.has(s.id)
              );

              let targets = [
                ...(!isAppAssigned ? [{ value: `app:${appId}`, label: 'App (entire app)' }] : []),
                ...availableSurfaces.map((s: any) => ({
                  value: `surface:${s.id}`,
                  label: `Surface: ${s.clientId}`
                }))
              ];

              let form = useForm({
                initialValues: { target: targets[0]?.value ?? '' },
                onSubmit: async values => {
                  let [type, id] = values.target.split(':') as [string, string];
                  let res: any;
                  if (type === 'app') {
                    [res] = await assignApp.mutate({
                      accessGroupId: accessGroupId!,
                      appId: id
                    });
                  } else {
                    [res] = await assignSurface.mutate({
                      accessGroupId: accessGroupId!,
                      surfaceId: id
                    });
                  }
                  if (res) {
                    close();
                    accessGroup.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    target: yup.string().required('Select a target')
                  }) as any
              });

              let isLoading = assignApp.isLoading || assignSurface.isLoading;
              let isSuccess = assignApp.isSuccess || assignSurface.isSuccess;

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Assign to App or Surface</Dialog.Title>

                  {targets.length === 0 ? (
                    <p style={{ color: '#888' }}>Already assigned to all available targets.</p>
                  ) : (
                    <form onSubmit={form.handleSubmit}>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                          Target
                        </label>
                        <Select.Root
                          value={form.values.target}
                          onValueChange={val => form.setFieldValue('target', val)}
                        >
                          <Select.Trigger style={{ width: '100%' }} />
                          <Select.Content>
                            {targets.map(t => (
                              <Select.Item key={t.value} value={t.value}>
                                {t.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      </div>

                      <Button type="submit" loading={isLoading} success={isSuccess}>
                        Assign
                      </Button>
                      <assignApp.RenderError />
                      <assignSurface.RenderError />
                    </form>
                  )}
                </Dialog.Wrapper>
              );
            })
          }
        >
          Assign
        </Button>
      </div>

      <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        Assign this access group to the app or specific surfaces to restrict access.
      </p>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Target</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {(accessGroup.data.assignments ?? []).map((assignment: any) => (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              onUpdate={() => accessGroup.refetch()}
            />
          ))}

          {(!accessGroup.data.assignments || accessGroup.data.assignments.length === 0) && (
            <Table.Row>
              <Table.Cell colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                Not assigned to any app or surface
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </>
  ));
};

let AssignmentRow = ({
  assignment,
  onUpdate
}: {
  assignment: any;
  onUpdate: () => void;
}) => {
  let unassign = useMutation(adminClient.accessGroup.unassign);

  let target = assignment.target;
  let targetLabel = target
    ? target.type === 'app'
      ? target.clientId
      : target.clientId
    : 'Unknown';
  let targetType = target?.type === 'app' ? 'App' : 'Surface';

  return (
    <Table.Row>
      <Table.Cell>{targetLabel}</Table.Cell>
      <Table.Cell>{targetType}</Table.Cell>
      <Table.Cell>
        <Button
          size="1"
          variant="outline"
          loading={unassign.isLoading}
          onClick={async () => {
            if (!confirm('Remove this assignment?')) return;
            await unassign.mutate({ assignmentId: assignment.id });
            onUpdate();
          }}
        >
          Remove
        </Button>
      </Table.Cell>
    </Table.Row>
  );
};

let RuleRow = ({
  rule,
  accessGroupId,
  allRules,
  onUpdate
}: {
  rule: any;
  accessGroupId: string;
  allRules: any[];
  onUpdate: () => void;
}) => {
  let update = useMutation(adminClient.accessGroup.update);

  return (
    <Table.Row>
      <Table.Cell>{ruleTypeLabel(rule.type)}</Table.Cell>
      <Table.Cell>{rule.value}</Table.Cell>
      <Table.Cell>
        <Button
          size="1"
          variant="outline"
          loading={update.isLoading}
          onClick={async () => {
            if (!confirm('Delete this rule?')) return;
            let remainingRules = allRules
              .filter((r: any) => r.id !== rule.id)
              .map((r: any) => ({ type: r.type, value: r.value }));
            await update.mutate({
              id: accessGroupId,
              rules: remainingRules
            });
            onUpdate();
          }}
        >
          Delete
        </Button>
      </Table.Cell>
    </Table.Row>
  );
};
