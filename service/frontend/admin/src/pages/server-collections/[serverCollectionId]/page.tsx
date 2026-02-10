import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Dialog, showModal, Spacer, TextArrayInput } from '@metorial/ui';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { serverCollectionState } from '../../../state';

export let ServerCollectionPage = () => {
  let { serverCollectionId } = useParams();
  let serverCollection = serverCollectionState.use({ id: serverCollectionId! });

  return renderWithLoader({ serverCollection })(({ serverCollection }) => (
    <>
      <Heading as="h1" size="7">
        {serverCollection.data.name}
      </Heading>

      <Spacer size={15} />

      <Button
        size="2"
        onClick={() =>
          showModal(({ dialogProps, close }) => {
            let update = useMutation(serverCollection.mutators.update);

            let form = useForm({
              initialValues: {
                serverIds: serverCollection.data.listings.map(l => l.id)
              },
              onSubmit: async values => {
                await update.mutate(values);
                close();
              },
              schema: yup =>
                yup.object({
                  serverIds: yup.array().of(yup.string().required()).required()
                })
            });

            return (
              <Dialog.Wrapper {...dialogProps}>
                <Dialog.Title>Edit Server Collection</Dialog.Title>

                <form {...dialogProps} onSubmit={form.handleSubmit}>
                  <TextArrayInput
                    label="Server IDs"
                    description="List of Server IDs in this collection"
                    value={form.values.serverIds}
                    onChange={val => form.setFieldValue('serverIds', val)}
                  />
                  <form.RenderError field="serverIds" />

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
        Edit Server Collection
      </Button>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Server Collection
      </Heading>

      <DataList.Root>
        {[
          ['ID', serverCollection.data.id],
          ['Slug', serverCollection.data.slug],
          ['Name', serverCollection.data.name],
          ['Description', serverCollection.data.description],
          ['Created At', serverCollection.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', serverCollection.data.updatedAt.toLocaleDateString('de-at')]
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
