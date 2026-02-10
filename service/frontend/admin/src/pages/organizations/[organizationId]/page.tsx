import { renderWithLoader, useMutation } from '@metorial/data-hooks';
import {
  Attributes,
  Button,
  Copy,
  Dialog,
  Flex,
  Input,
  Select,
  showModal,
  Spacer,
  Switch,
  toast
} from '@metorial/ui';
import { DataList, Heading, Table } from '@radix-ui/themes';
import { RiDeleteBinLine } from '@remixicon/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  organizationFlagsState,
  organizationPlanState,
  organizationState,
  plansState
} from '../../../state';
import { showCreateCompanyModal } from '../../companies/page';
import { showCreateCustomPlanModal } from '../../plans/page';

let Part = styled.div`
  border: solid 1px #ddd;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  background: white;
  margin-bottom: 10px;
`;

let Label = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

export let OrganizationPage = () => {
  let { organizationId } = useParams();
  let organization = organizationState.use({ id: organizationId! });
  let organizationPlan = organizationPlanState.use({
    organizationId: organizationId!
  });
  let plans = plansState.use(
    organization.data ? { organizationId: organization.data.id } : null
  );

  let setOrganizationPlanPaid = useMutation(organizationPlan.mutators.setOrganizationPlanPaid);
  let cancelOrganizationPlanPaid = useMutation(
    organizationPlan.mutators.cancelOrganizationPlanPaid
  );

  let linkCompany = useMutation(organization.mutators.linkCompany);

  let flags = organizationFlagsState.use({ organizationId: organizationId! });
  let assignFlag = useMutation(flags.mutators.assignFlagToOrganization);
  let assignCohort = useMutation(flags.mutators.setOrganizationCohort);
  let assignBeta = useMutation(flags.mutators.setOrganizationBeta);

  let [isTobias, setIsTobias] = useState(false);

  return renderWithLoader({ organization, organizationPlan })(
    ({ organization, organizationPlan }) => (
      <>
        <Heading as="h1" size="7">
          {organization.data.name}
        </Heading>

        <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          User Profile
        </Heading>

        <DataList.Root>
          {[
            ['Id', organization.data.id],
            ['Slug', organization.data.slug],
            ['Name', organization.data.name],
            ['Status', organization.data.status],
            ['Type', organization.data.type],
            ['Created At', organization.data.createdAt.toLocaleDateString('de-at')],
            ['Updated At', organization.data.updatedAt.toLocaleDateString('de-at')],
            ['Deleted At', organization.data.deletedAt?.toLocaleDateString('de-at')]
          ].map(([label, value]) => (
            <DataList.Item key={label}>
              <DataList.Label>{label}</DataList.Label>
              <DataList.Value>{value}</DataList.Value>
            </DataList.Item>
          ))}
        </DataList.Root>

        <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          Members
        </Heading>

        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {organization.data.members.map(member => (
              <Table.Row key={member.id}>
                <Table.Cell>{member.name}</Table.Cell>
                <Table.Cell>{member.email}</Table.Cell>
                <Table.Cell>{member.createdAt.toLocaleDateString('de-at')}</Table.Cell>
                <Table.Cell>
                  <Link to={`/users/${member.user?.id}`}>
                    <Button as="span" size="1">
                      View
                    </Button>
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          Billing
        </Heading>

        <Attributes
          attributes={[
            { label: 'Plan Name', content: organizationPlan.data.name },
            { label: 'Plan Slug', content: organizationPlan.data.slug },
            { label: 'Plan ID', content: organizationPlan.data.id }
          ]}
        />

        <Spacer height={15} />

        <Flex gap={15} align="center">
          <Button
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let update = useMutation(organizationPlan.mutators.setOrganizationPlan);
                let plans = plansState.use({
                  organizationId: organization.data.id
                });

                let [planId, setPlanId] = useState<string>(organizationPlan.data.id);

                return (
                  <Dialog.Wrapper {...dialogProps}>
                    <Dialog.Title>Set Plan</Dialog.Title>

                    <Select
                      label="Plan"
                      items={plans.data?.map(p => ({ id: p.id, label: p.name })) ?? []}
                      value={planId}
                      onChange={setPlanId}
                    />

                    <Spacer height={15} />

                    <Dialog.Actions>
                      <Button
                        onClick={() => {
                          update.mutate({
                            organizationId: organizationId!,
                            planId
                          });
                          close();
                        }}
                      >
                        Set Plan
                      </Button>
                    </Dialog.Actions>
                  </Dialog.Wrapper>
                );
              })
            }
            size="2"
          >
            Set Plan
          </Button>

          <Button
            onClick={() => {
              showCreateCustomPlanModal({
                organization: organization.data,
                onPlanCreated: ({ planId }) => {}
              });
            }}
            size="2"
          >
            Create Custom Plan
          </Button>

          <Button
            onClick={() =>
              showModal(({ dialogProps, close }) => {
                let update = useMutation(organizationPlan.mutators.setOrganizationPlanPaid);
                let plans = plansState.use({
                  organizationId: organization.data.id
                });

                let [planId, setPlanId] = useState<string>(organizationPlan.data.id);

                return (
                  <Dialog.Wrapper {...dialogProps}>
                    <Dialog.Title>Set Plan</Dialog.Title>

                    <Select
                      label="Plan"
                      items={plans.data?.map(p => ({ id: p.id, label: p.name })) ?? []}
                      value={planId}
                      onChange={setPlanId}
                    />

                    <Spacer height={15} />

                    <Dialog.Actions>
                      <Button
                        onClick={async () => {
                          let [res] = await update.mutate({
                            organizationId: organizationId!,
                            planId,
                            backUrl: 'https://app.metorial.com'
                          });

                          if (res) {
                            close();

                            if (res.type == 'checkout') {
                              showModal(({ dialogProps, close }) => {
                                return (
                                  <Dialog.Wrapper {...dialogProps} width={400}>
                                    <Dialog.Title>Payment Link Created</Dialog.Title>

                                    <p>
                                      Send the following link to the customer to complete the
                                      payment:
                                    </p>

                                    <Copy
                                      label="Payment Link"
                                      value={res.fullCheckout.url.replaceAll(
                                        'billing-api.metorial.com',
                                        'checkout.metorial.com'
                                      )}
                                    />
                                  </Dialog.Wrapper>
                                );
                              });
                            } else if (res.type == 'subscription_update') {
                              toast.success(
                                'Subscription updated successfully. No need for a payment link.'
                              );
                            } else {
                              toast.error('No updates were made to the subscription.');
                            }
                          }
                        }}
                      >
                        Set Plan
                      </Button>
                    </Dialog.Actions>
                  </Dialog.Wrapper>
                );
              })
            }
            size="2"
          >
            Create Payment Link
          </Button>

          <Button
            size="2"
            onClick={() => {
              showCreateCompanyModal({
                onComplete: company => {
                  linkCompany.mutate({
                    companyId: company.id,
                    organizationId: organization.data.id
                  });
                }
              });
            }}
            loading={linkCompany.isLoading}
            success={linkCompany.isSuccess}
          >
            Link Company
          </Button>
        </Flex>

        <Spacer height={15} />

        <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          Flags & More
        </Heading>

        <Part>
          <Label>Flags</Label>

          <Switch label="Are you Tobias?" checked={isTobias} onCheckedChange={setIsTobias} />

          {isTobias &&
            flags.data?.flags.map(flag => (
              <div
                key={flag.flag.id}
                style={{
                  padding: 10,
                  display: 'flex',
                  gap: 10,
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <p>{flag.flag.slug}</p>
                <Input
                  label="Flag"
                  hideLabel
                  defaultValue={JSON.stringify(flag.value)}
                  onBlur={e => {
                    let value = e.target.value;
                    assignFlag.mutate({
                      organizationId: organization.data.id,
                      flagId: flag.flag.id,
                      value
                    });
                  }}
                  disabled={assignFlag.isLoading}
                />

                <Button
                  iconRight={<RiDeleteBinLine />}
                  onClick={() => {
                    assignFlag.mutate({
                      organizationId: organization.data.id,
                      flagId: flag.flag.id,
                      value: 'null'
                    });
                  }}
                />
              </div>
            ))}
        </Part>

        <Part>
          <Label>Betas</Label>

          {flags.data?.betas.map(b => (
            <div
              key={b.beta.id}
              style={{
                padding: 10,
                display: 'flex',
                gap: 10,
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>{b.beta.slug}</div>
              <div>
                <Switch
                  label={b.beta.slug}
                  hideLabel
                  checked={b.assigned}
                  onCheckedChange={async checked => {
                    await assignBeta.mutate({
                      organizationId: organization.data.id,
                      betaId: b.beta.id,
                      status: checked ? 'active' : 'inactive'
                    });
                  }}
                  disabled={assignBeta.isLoading}
                />
              </div>
            </div>
          ))}
        </Part>

        <Part>
          <Label>Cohorts</Label>

          {flags.data?.cohorts.map(b => (
            <div
              key={b.cohort.id}
              style={{
                padding: 10,
                display: 'flex',
                gap: 10,
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>{b.cohort.slug}</div>
              <div>
                <Switch
                  label={b.cohort.slug}
                  hideLabel
                  checked={b.assigned}
                  onCheckedChange={async checked => {
                    await assignCohort.mutate({
                      organizationId: organization.data.id,
                      cohortId: b.cohort.id,
                      status: checked ? 'active' : 'inactive'
                    });
                  }}
                  disabled={assignCohort.isLoading}
                />
              </div>
            </div>
          ))}
        </Part>

        {/* <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
          Projects
        </Heading>

        <Grid columns="2" gap="2">
          {organization.data.projects.map(project => (
            <Card key={project.id}>
              <Heading as="h3" size="4">
                {project.name}
              </Heading>

              <DataList.Root>
                {[
                  ['ID', project.id],
                  ['Name', project.name],
                  ['Slug', project.slug],
                  ['Created At', project.createdAt.toLocaleDateString('de-at')],
                  ['Updated At', project.updatedAt.toLocaleDateString('de-at')],
                  ['Deleted At', project.deletedAt?.toLocaleDateString('de-at')]
                ].map(([label, value]) => (
                  <DataList.Item key={label}>
                    <DataList.Label>{label}</DataList.Label>
                    <DataList.Value>{value}</DataList.Value>
                  </DataList.Item>
                ))}
              </DataList.Root>

              <Heading as="h4" size="2" style={{ marginBottom: 10, marginTop: 20 }}>
                Instances
              </Heading>

              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Slug</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Created At</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {project.instances.map(instance => (
                    <Table.Row key={instance.id}>
                      <Table.Cell>{instance.id}</Table.Cell>
                      <Table.Cell>{instance.name}</Table.Cell>
                      <Table.Cell>{instance.slug}</Table.Cell>
                      <Table.Cell>{instance.createdAt.toLocaleDateString('de-at')}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>
          ))}
        </Grid> */}
      </>
    )
  );
};
