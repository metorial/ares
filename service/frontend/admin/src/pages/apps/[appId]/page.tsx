import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { DataList, Heading, Select, Table } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import {
  accessGroupsState,
  appAccessGroupAssignmentsState,
  appState,
  appSurfacesState,
  oauthProvidersState,
  ssoTenantsState,
  surfaceAccessGroupAssignmentsState
} from '../../../state';
import { adminClient } from '../../../state/client';

export let AppPage = () => {
  let { appId } = useParams();
  let app = appState.use({ id: appId! });
  let ssoTenants = ssoTenantsState.use({ appId: appId! });
  let oauthProviders = oauthProvidersState.use({ appId: appId! });
  let accessGroups = accessGroupsState.use({ appId: appId! });
  let appAssignments = appAccessGroupAssignmentsState.use({ appId: appId! });
  let surfaces = appSurfacesState.use({ appId: appId! });

  return renderWithLoader({ app, ssoTenants, oauthProviders, accessGroups, appAssignments, surfaces })(
    ({ app, ssoTenants, oauthProviders, accessGroups, appAssignments, surfaces }) => (
      <>
        <Heading as="h1" size="7">
          {app.data.clientId}
        </Heading>

        <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          App Details
        </Heading>

        <DataList.Root>
          {[
            ['ID', app.data.id],
            ['Client ID', app.data.clientId],
            ['Slug', app.data.slug ?? '-'],
            ['Has Terms', app.data.hasTerms ? 'Yes' : 'No'],
            ['Default Redirect URL', app.data.defaultRedirectUrl ?? '-'],
            ['Default Tenant', app.data.defaultTenant?.clientId ?? '-'],
            ['Users', app.data.counts.users],
            ['Tenants', app.data.counts.tenants],
            ['Created At', new Date(app.data.createdAt).toLocaleDateString('de-at')],
            ['Updated At', new Date(app.data.updatedAt).toLocaleDateString('de-at')]
          ].map(([label, value]) => (
            <DataList.Item key={label}>
              <DataList.Label>{label}</DataList.Label>
              <DataList.Value>{value}</DataList.Value>
            </DataList.Item>
          ))}
        </DataList.Root>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
          <Heading as="h2" size="4">
            OAuth Providers
          </Heading>

          <Button
            size="1"
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let create = useMutation(adminClient.oauthProvider.create);

                let form = useForm({
                  initialValues: {
                    provider: 'google' as 'google' | 'github',
                    clientId: '',
                    clientSecret: '',
                    redirectUri: ''
                  },
                  onSubmit: async values => {
                    let [res] = await create.mutate({
                      appId: appId!,
                      provider: values.provider,
                      clientId: values.clientId,
                      clientSecret: values.clientSecret,
                      redirectUri: values.redirectUri
                    });
                    if (res) {
                      close();
                      oauthProviders.refetch();
                    }
                  },
                  schema: yup =>
                    yup.object({
                      provider: yup.string().oneOf(['google', 'github']).required(),
                      clientId: yup.string().required('Client ID is required'),
                      clientSecret: yup.string().required('Client Secret is required'),
                      redirectUri: yup.string().url('Must be a valid URL').required('Redirect URI is required')
                    }) as any
                });

                return (
                  <Dialog.Wrapper {...dialogProps}>
                    <Dialog.Title>Add OAuth Provider</Dialog.Title>

                    <form onSubmit={form.handleSubmit}>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                          Provider
                        </label>
                        <Select.Root
                          value={form.values.provider}
                          onValueChange={val => form.setFieldValue('provider', val)}
                        >
                          <Select.Trigger style={{ width: '100%' }} />
                          <Select.Content>
                            <Select.Item value="google">Google</Select.Item>
                            <Select.Item value="github">GitHub</Select.Item>
                          </Select.Content>
                        </Select.Root>
                      </div>

                      <Input label="Client ID" {...form.getFieldProps('clientId')} />
                      <form.RenderError field="clientId" />

                      <Spacer size={15} />

                      <Input label="Client Secret" {...form.getFieldProps('clientSecret')} />
                      <form.RenderError field="clientSecret" />

                      <Spacer size={15} />

                      <Input label="Redirect URI" {...form.getFieldProps('redirectUri')} />
                      <form.RenderError field="redirectUri" />

                      <Spacer size={15} />

                      <Button type="submit" loading={create.isLoading} success={create.isSuccess}>
                        Create
                      </Button>
                      <create.RenderError />
                    </form>
                  </Dialog.Wrapper>
                );
              })
            }
          >
            Add OAuth Provider
          </Button>
        </div>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Client ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Redirect URI</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Enabled</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {oauthProviders.data.map((provider: any) => (
              <OAuthProviderRow
                key={provider.id}
                provider={provider}
                onUpdate={() => oauthProviders.refetch()}
              />
            ))}

            {oauthProviders.data.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={6} style={{ textAlign: 'center', color: '#888' }}>
                  No OAuth providers configured
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
          <Heading as="h2" size="4">
            SSO Tenants
          </Heading>

          <Button
            size="1"
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let create = useMutation(adminClient.sso.createTenant);

                let form = useForm({
                  initialValues: { name: '' },
                  onSubmit: async values => {
                    let [res] = await create.mutate({
                      appId: appId!,
                      name: values.name
                    });
                    if (res) {
                      close();
                      ssoTenants.refetch();
                    }
                  },
                  schema: yup =>
                    yup.object({
                      name: yup.string().required('Name is required')
                    }) as any
                });

                return (
                  <Dialog.Wrapper {...dialogProps}>
                    <Dialog.Title>Create SSO Tenant</Dialog.Title>

                    <form onSubmit={form.handleSubmit}>
                      <Input label="Name" {...form.getFieldProps('name')} />
                      <form.RenderError field="name" />

                      <Spacer size={15} />

                      <Button type="submit" loading={create.isLoading} success={create.isSuccess}>
                        Create
                      </Button>
                      <create.RenderError />
                    </form>
                  </Dialog.Wrapper>
                );
              })
            }
          >
            Create SSO Tenant
          </Button>
        </div>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Connections</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {ssoTenants.data.map((tenant: any) => (
              <Table.Row key={tenant.id}>
                <Table.Cell>{tenant.name}</Table.Cell>
                <Table.Cell>{tenant.status}</Table.Cell>
                <Table.Cell>{tenant.counts.connections}</Table.Cell>
                <Table.Cell>{new Date(tenant.createdAt).toLocaleDateString('de-at')}</Table.Cell>
                <Table.Cell>
                  <Link to={`/apps/${appId}/sso/${tenant.id}`}>
                    <Button as="span" size="1">
                      View
                    </Button>
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}

            {ssoTenants.data.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                  No SSO tenants configured
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
          <Heading as="h2" size="4">
            Access Groups
          </Heading>

          <Link to={`/apps/${appId}/access-groups`}>
            <Button as="span" size="1">
              Manage
            </Button>
          </Link>
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
              <Table.Row key={group.id}>
                <Table.Cell>{group.name}</Table.Cell>
                <Table.Cell>{group.counts.rules}</Table.Cell>
                <Table.Cell>{new Date(group.createdAt).toLocaleDateString('de-at')}</Table.Cell>
                <Table.Cell>
                  <Link to={`/apps/${appId}/access-groups/${group.id}`}>
                    <Button as="span" size="1">
                      View
                    </Button>
                  </Link>
                </Table.Cell>
              </Table.Row>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
          <Heading as="h2" size="4">
            App Access Whitelist
          </Heading>

          {accessGroups.data.length > 0 && (
            <Button
              size="1"
              onClick={() =>
                showModal(({ dialogProps, close }) => {
                  let assign = useMutation(adminClient.accessGroup.assignToApp);
                  let assignedIds = new Set(appAssignments.data.map((a: any) => a.accessGroup.id));
                  let available = accessGroups.data.filter((g: any) => !assignedIds.has(g.id));

                  let form = useForm({
                    initialValues: { accessGroupId: available[0]?.id ?? '' },
                    onSubmit: async values => {
                      let [res] = await assign.mutate({
                        accessGroupId: values.accessGroupId,
                        appId: appId!
                      });
                      if (res) {
                        close();
                        appAssignments.refetch();
                      }
                    },
                    schema: yup =>
                      yup.object({
                        accessGroupId: yup.string().required('Select an access group')
                      }) as any
                  });

                  return (
                    <Dialog.Wrapper {...dialogProps}>
                      <Dialog.Title>Assign Access Group to App</Dialog.Title>

                      {available.length === 0 ? (
                        <p style={{ color: '#888' }}>All access groups are already assigned.</p>
                      ) : (
                        <form onSubmit={form.handleSubmit}>
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                              Access Group
                            </label>
                            <Select.Root
                              value={form.values.accessGroupId}
                              onValueChange={val => form.setFieldValue('accessGroupId', val)}
                            >
                              <Select.Trigger style={{ width: '100%' }} />
                              <Select.Content>
                                {available.map((g: any) => (
                                  <Select.Item key={g.id} value={g.id}>
                                    {g.name}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Root>
                          </div>

                          <Button type="submit" loading={assign.isLoading} success={assign.isSuccess}>
                            Assign
                          </Button>
                          <assign.RenderError />
                        </form>
                      )}
                    </Dialog.Wrapper>
                  );
                })
              }
            >
              Add
            </Button>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
          If no access groups are assigned, all users can access this app. Otherwise, users must match at least one assigned access group.
        </p>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Access Group</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Rules</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {appAssignments.data.map((assignment: any) => (
              <AppAssignmentRow
                key={assignment.id}
                assignment={assignment}
                onUpdate={() => appAssignments.refetch()}
              />
            ))}

            {appAssignments.data.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                  No access groups assigned (all users allowed)
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 30, marginBottom: 10 }}>
          <Heading as="h2" size="4">
            Surfaces
          </Heading>
        </div>

        {surfaces.data.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>No surfaces configured</p>
        ) : (
          surfaces.data.map((surface: any) => (
            <SurfaceSection
              key={surface.id}
              surface={surface}
              appId={appId!}
              accessGroups={accessGroups.data}
            />
          ))
        )}
      </>
    )
  );
};

let AppAssignmentRow = ({
  assignment,
  onUpdate
}: {
  assignment: any;
  onUpdate: () => void;
}) => {
  let unassign = useMutation(adminClient.accessGroup.unassign);

  return (
    <Table.Row>
      <Table.Cell>{assignment.accessGroup.name}</Table.Cell>
      <Table.Cell>{assignment.accessGroup.counts.rules}</Table.Cell>
      <Table.Cell>
        <Button
          size="1"
          variant="outline"
          loading={unassign.isLoading}
          onClick={async () => {
            if (!confirm('Remove this access group from the app whitelist?')) return;
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

let SurfaceSection = ({
  surface,
  appId,
  accessGroups
}: {
  surface: any;
  appId: string;
  accessGroups: any[];
}) => {
  let assignments = surfaceAccessGroupAssignmentsState.use({ surfaceId: surface.id });

  return renderWithLoader({ assignments })(({ assignments }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Heading as="h3" size="3">
          {surface.clientId}
        </Heading>

        {accessGroups.length > 0 && (
          <Button
            size="1"
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let assign = useMutation(adminClient.accessGroup.assignToSurface);
                let assignedIds = new Set(assignments.data.map((a: any) => a.accessGroup.id));
                let available = accessGroups.filter((g: any) => !assignedIds.has(g.id));

                let form = useForm({
                  initialValues: { accessGroupId: available[0]?.id ?? '' },
                  onSubmit: async values => {
                    let [res] = await assign.mutate({
                      accessGroupId: values.accessGroupId,
                      surfaceId: surface.id
                    });
                    if (res) {
                      close();
                      assignments.refetch();
                    }
                  },
                  schema: yup =>
                    yup.object({
                      accessGroupId: yup.string().required('Select an access group')
                    }) as any
                });

                return (
                  <Dialog.Wrapper {...dialogProps}>
                    <Dialog.Title>Assign Access Group to Surface</Dialog.Title>

                    {available.length === 0 ? (
                      <p style={{ color: '#888' }}>All access groups are already assigned.</p>
                    ) : (
                      <form onSubmit={form.handleSubmit}>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                            Access Group
                          </label>
                          <Select.Root
                            value={form.values.accessGroupId}
                            onValueChange={val => form.setFieldValue('accessGroupId', val)}
                          >
                            <Select.Trigger style={{ width: '100%' }} />
                            <Select.Content>
                              {available.map((g: any) => (
                                <Select.Item key={g.id} value={g.id}>
                                  {g.name}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </div>

                        <Button type="submit" loading={assign.isLoading} success={assign.isSuccess}>
                          Assign
                        </Button>
                        <assign.RenderError />
                      </form>
                    )}
                  </Dialog.Wrapper>
                );
              })
            }
          >
            Add
          </Button>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
        {assignments.data.length === 0
          ? 'No access groups assigned (all users with app access allowed)'
          : 'Users must also match at least one of these access groups'}
      </p>

      <Table.Root variant="surface" size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Access Group</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Rules</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {assignments.data.map((assignment: any) => (
            <SurfaceAssignmentRow
              key={assignment.id}
              assignment={assignment}
              onUpdate={() => assignments.refetch()}
            />
          ))}

          {assignments.data.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                No access groups assigned
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </div>
  ));
};

let SurfaceAssignmentRow = ({
  assignment,
  onUpdate
}: {
  assignment: any;
  onUpdate: () => void;
}) => {
  let unassign = useMutation(adminClient.accessGroup.unassign);

  return (
    <Table.Row>
      <Table.Cell>{assignment.accessGroup.name}</Table.Cell>
      <Table.Cell>{assignment.accessGroup.counts.rules}</Table.Cell>
      <Table.Cell>
        <Button
          size="1"
          variant="outline"
          loading={unassign.isLoading}
          onClick={async () => {
            if (!confirm('Remove this access group from the surface?')) return;
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

let OAuthProviderRow = ({
  provider,
  onUpdate
}: {
  provider: any;
  onUpdate: () => void;
}) => {
  let toggleEnabled = useMutation(adminClient.oauthProvider.update);
  let deleteProvider = useMutation(adminClient.oauthProvider.delete);

  return (
    <Table.Row>
      <Table.Cell>{provider.provider}</Table.Cell>
      <Table.Cell>{provider.clientId}</Table.Cell>
      <Table.Cell style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {provider.redirectUri}
      </Table.Cell>
      <Table.Cell>{provider.enabled ? 'Yes' : 'No'}</Table.Cell>
      <Table.Cell>{new Date(provider.createdAt).toLocaleDateString('de-at')}</Table.Cell>
      <Table.Cell>
        <div style={{ display: 'flex', gap: 5 }}>
          <Button
            size="1"
            variant="outline"
            loading={toggleEnabled.isLoading}
            onClick={async () => {
              await toggleEnabled.mutate({
                id: provider.id,
                enabled: !provider.enabled
              });
              onUpdate();
            }}
          >
            {provider.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            size="1"
            variant="outline"
            loading={deleteProvider.isLoading}
            onClick={async () => {
              if (!confirm('Delete this OAuth provider?')) return;
              await deleteProvider.mutate({ id: provider.id });
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
