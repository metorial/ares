import { renderWithLoader, useForm } from '@metorial/data-hooks';
import { Button, Dialog, Input, showModal, Spacer, TextArrayInput } from '@metorial/ui';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { handoffApplicationState } from '../../../state';

export let HandoffDetailsPage = () => {
  let { handoffId } = useParams();
  let handoff = handoffApplicationState.use({ id: handoffId! });
  let handoffOuter = handoff;

  return renderWithLoader({ handoff })(({ handoff }) => (
    <>
      <Heading as="h1" size="7">
        {handoff.data.name}
      </Heading>

      <Spacer size={15} />

      <Button
        size="2"
        onClick={() =>
          showModal(({ dialogProps, close }) => {
            let update = handoffOuter.useMutator('update')();

            let form = useForm({
              initialValues: {
                name: handoff.data.name,
                redirectUris: handoff.data.redirectUris
              },
              onSubmit: async values => {
                await update.mutate(values);
                close();
              },
              schema: yup =>
                yup.object({
                  name: yup.string().required(),
                  redirectUris: yup.array().of(yup.string().url().required()).required()
                })
            });

            return (
              <Dialog.Wrapper {...dialogProps}>
                <Dialog.Title>Edit Application</Dialog.Title>

                <form {...dialogProps} onSubmit={form.handleSubmit}>
                  <Input label="Name" {...form.getFieldProps('name')} type="name" />
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

                  <Button type="submit" loading={update.isLoading} success={update.isSuccess}>
                    Update
                  </Button>
                  <update.RenderError />
                </form>
              </Dialog.Wrapper>
            );
          })
        }
      >
        Edit Application
      </Button>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Application Details
      </Heading>

      <DataList.Root>
        {[
          ['ID', handoff.data.id],
          ['Client ID', handoff.data.clientId],
          ['Client Secret', handoff.data.clientSecret],
          ['Name', handoff.data.name],
          ['Redirect URI', handoff.data.redirectUris.join(', ')],
          ['Created At', handoff.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', handoff.data.updatedAt.toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>
    </>
  ));
};
