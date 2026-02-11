import { renderWithLoader, useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Dialog, Input, showModal, Spacer } from '@metorial-io/ui';
import { Badge, DataList, Heading, Select, Table, Text } from '@radix-ui/themes';
import { Link, useParams } from 'react-router-dom';
import {
  accessGroupsState,
  appAccessGroupAssignmentsState,
  appState,
  globalSsoTenantsState,
  oauthProvidersState,
  ssoTenantsState
} from '../../../state';
import { adminClient } from '../../../state/client';

export let AppPage = () => {
  let { appId } = useParams();
  let app = appState.use({ id: appId! });
  let ssoTenants = ssoTenantsState.use({ appId: appId! });
  let ssoTenantsRoot = ssoTenants;
  let globalSsoTenants = globalSsoTenantsState.use();
  let oauthProviders = oauthProvidersState.use({ appId: appId! });
  let oauthProvidersRoot = oauthProviders;
  let accessGroups = accessGroupsState.use({ appId: appId! });
  let appAssignments = appAccessGroupAssignmentsState.use({ appId: appId! });
  let appAssignmentsRoot = appAssignments;

  return renderWithLoader({
    app,
    ssoTenants,
    globalSsoTenants,
    oauthProviders,
    accessGroups,
    appAssignments
  })(({ app, ssoTenants, globalSsoTenants, oauthProviders, accessGroups, appAssignments }) => (
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

      <RedirectDomainsSection appId={appId!} app={app} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
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
                    oauthProvidersRoot.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    provider: yup.string().oneOf(['google', 'github']).required(),
                    clientId: yup.string().required('Client ID is required'),
                    clientSecret: yup.string().required('Client Secret is required'),
                    redirectUri: yup
                      .string()
                      .url('Must be a valid URL')
                      .required('Redirect URI is required')
                  }) as any
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Add OAuth Provider</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <div style={{ marginBottom: 10 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 14,
                          fontWeight: 500
                        }}
                      >
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
          {oauthProviders.data.items.map((provider: any) => (
            <OAuthProviderRow
              key={provider.id}
              provider={provider}
              onUpdate={() => oauthProvidersRoot.refetch()}
            />
          ))}

          {oauthProviders.data.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={6} style={{ textAlign: 'center', color: '#888' }}>
                No OAuth providers configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
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
                    ssoTenantsRoot.refetch();
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
          {ssoTenants.data.items.map((tenant: any) => (
            <Table.Row key={tenant.id}>
              <Table.Cell>
                {tenant.name}
                {tenant.isGlobal && (
                  <Badge color="blue" style={{ marginLeft: 8 }}>
                    Global
                  </Badge>
                )}
              </Table.Cell>
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

          {globalSsoTenants.data.items
            .filter((gt: any) => !ssoTenants.data.items.some((t: any) => t.id === gt.id))
            .map((tenant: any) => (
              <Table.Row key={tenant.id}>
                <Table.Cell>
                  {tenant.name}
                  <Badge color="blue" style={{ marginLeft: 8 }}>
                    Global
                  </Badge>
                </Table.Cell>
                <Table.Cell>{tenant.status}</Table.Cell>
                <Table.Cell>{tenant.counts.connections}</Table.Cell>
                <Table.Cell>
                  {new Date(tenant.createdAt).toLocaleDateString('de-at')}
                </Table.Cell>
                <Table.Cell>
                  <Link to={`/apps/${tenant.app.id}/sso/${tenant.id}`}>
                    <Button as="span" size="1">
                      View
                    </Button>
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}

          {ssoTenants.data.items.length === 0 && globalSsoTenants.data.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5} style={{ textAlign: 'center', color: '#888' }}>
                No SSO tenants configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
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
          {accessGroups.data.items.map((group: any) => (
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

          {accessGroups.data.items.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={4} style={{ textAlign: 'center', color: '#888' }}>
                No access groups configured
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        <Heading as="h2" size="4">
          App Access Whitelist
        </Heading>

        {accessGroups.data.items.length > 0 && (
          <Button
            size="1"
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let assign = useMutation(adminClient.accessGroup.assignToApp);
                let assignedIds = new Set(
                  appAssignments.data.map((a: any) => a.accessGroup.id)
                );
                let available = accessGroups.data.items.filter((g: any) => !assignedIds.has(g.id));

                let form = useForm({
                  initialValues: { accessGroupId: available[0]?.id ?? '' },
                  onSubmit: async values => {
                    let [res] = await assign.mutate({
                      accessGroupId: values.accessGroupId,
                      appId: appId!
                    });
                    if (res) {
                      close();
                      appAssignmentsRoot.refetch();
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
                          <label
                            style={{
                              display: 'block',
                              marginBottom: 4,
                              fontSize: 14,
                              fontWeight: 500
                            }}
                          >
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

                        <Button
                          type="submit"
                          loading={assign.isLoading}
                          success={assign.isSuccess}
                        >
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
        If no access groups are assigned, all users can access this app. Otherwise, users must
        match at least one assigned access group.
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
              onUpdate={() => appAssignmentsRoot.refetch()}
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        <Heading as="h2" size="4">
          Surfaces
        </Heading>
      </div>
    </>
  ));
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

let RedirectDomainsSection = ({ appId, app }: { appId: string; app: any }) => {
  let update = useMutation(adminClient.app.update);

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 30,
          marginBottom: 10
        }}
      >
        <Heading as="h2" size="4">
          Redirect Domains
        </Heading>

        <Button
          size="1"
          onClick={() =>
            showModal(({ dialogProps, close }) => {
              let addDomain = useMutation(adminClient.app.update);

              let form = useForm({
                initialValues: { domain: '' },
                onSubmit: async values => {
                  let [res] = await addDomain.mutate({
                    id: appId,
                    redirectDomains: [...(app.data.redirectDomains ?? []), values.domain]
                  });
                  if (res) {
                    close();
                    app.refetch();
                  }
                },
                schema: yup =>
                  yup.object({
                    domain: yup.string().required('Domain is required')
                  }) as any
              });

              return (
                <Dialog.Wrapper {...dialogProps}>
                  <Dialog.Title>Add Redirect Domain</Dialog.Title>

                  <form onSubmit={form.handleSubmit}>
                    <Input
                      label="Domain"
                      placeholder="example.com or *.example.com"
                      {...form.getFieldProps('domain')}
                    />
                    <form.RenderError field="domain" />

                    <Spacer size={15} />

                    <Button
                      type="submit"
                      loading={addDomain.isLoading}
                      success={addDomain.isSuccess}
                    >
                      Add
                    </Button>
                    <addDomain.RenderError />
                  </form>
                </Dialog.Wrapper>
              );
            })
          }
        >
          Add Domain
        </Button>
      </div>

      <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>
        If empty, all redirect domains are allowed. Supports wildcard subdomains like *.example.com
      </p>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Domain</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {(app.data.redirectDomains ?? []).map((domain: string) => (
            <Table.Row key={domain}>
              <Table.Cell>
                <Text size="2" style={{ fontFamily: 'monospace' }}>
                  {domain}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Button
                  size="1"
                  variant="outline"
                  loading={update.isLoading}
                  onClick={async () => {
                    if (!confirm(`Remove "${domain}" from redirect domains?`)) return;
                    await update.mutate({
                      id: appId,
                      redirectDomains: (app.data.redirectDomains ?? []).filter(
                        (d: string) => d !== domain
                      )
                    });
                    app.refetch();
                  }}
                >
                  Remove
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}

          {(!app.data.redirectDomains || app.data.redirectDomains.length === 0) && (
            <Table.Row>
              <Table.Cell colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                No redirect domains configured (all domains allowed)
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </>
  );
};

let OAuthProviderRow = ({ provider, onUpdate }: { provider: any; onUpdate: () => void }) => {
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
