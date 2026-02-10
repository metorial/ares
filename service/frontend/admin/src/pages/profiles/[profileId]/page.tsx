import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import { Button, Checkbox, Dialog, Input, showModal, Spacer } from '@metorial/ui';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { profileState } from '../../../state';
import { uploadFileToCloudinary } from '../../../state/cloudinary';

export let ProfilePage = () => {
  let { profileId } = useParams();
  let profile = profileState.use({ id: profileId! });

  return renderWithLoader({ profile })(({ profile }) => (
    <>
      <Heading as="h1" size="7">
        {profile.data.name}
      </Heading>

      <Spacer size={15} />

      <Button
        size="2"
        onClick={() =>
          showModal(({ dialogProps, close }) => {
            let update = useMutation(profile.mutators.update);

            let form = useForm({
              initialValues: {
                name: profile.data.name,
                slug: profile.data.slug,
                description: profile.data.description || '',
                isVerified: profile.data.isVerified,
                isOfficial: profile.data.isOfficial,
                isMetorial: profile.data.isMetorial
              },
              onSubmit: async values => {
                await update.mutate(values);
                close();
              },
              schema: yup =>
                yup.object({
                  name: yup.string().required(),
                  slug: yup.string().required(),
                  description: yup.string().required(),
                  isVerified: yup.boolean().required(),
                  isOfficial: yup.boolean().required(),
                  isMetorial: yup.boolean().required()
                })
            });

            return (
              <Dialog.Wrapper {...dialogProps}>
                <Dialog.Title>Edit Profile</Dialog.Title>

                <form {...dialogProps} onSubmit={form.handleSubmit}>
                  <Button
                    type="button"
                    variant="outline"
                    size="1"
                    onClick={async () => {
                      let result = await uploadFileToCloudinary();
                      form.setFieldValue('imageUrl', result.secure_url);
                    }}
                  >
                    Upload Image
                  </Button>

                  <Spacer size={15} />

                  <Input label="Name" {...form.getFieldProps('name')} type="name" />
                  <form.RenderError field="name" />

                  <Spacer size={15} />

                  <Input label="Slug" {...form.getFieldProps('slug')} type="slug" />
                  <form.RenderError field="slug" />

                  <Spacer size={15} />

                  <Input
                    label="Description"
                    {...form.getFieldProps('description')}
                    type="description"
                    as="textarea"
                    minRows={5}
                  />
                  <form.RenderError field="description" />

                  <Spacer size={15} />

                  <Checkbox
                    label="Is Verified"
                    checked={form.values.isVerified}
                    onCheckedChange={checked =>
                      form.setFieldValue('isVerified', checked === true)
                    }
                  />
                  <form.RenderError field="isVerified" />

                  <Spacer size={15} />

                  <Checkbox
                    label="Is Official"
                    checked={form.values.isOfficial}
                    onCheckedChange={checked =>
                      form.setFieldValue('isOfficial', checked === true)
                    }
                  />
                  <form.RenderError field="isOfficial" />

                  <Spacer size={15} />

                  <Checkbox
                    label="Is Metorial"
                    checked={form.values.isMetorial}
                    onCheckedChange={checked =>
                      form.setFieldValue('isMetorial', checked === true)
                    }
                  />
                  <form.RenderError field="isMetorial" />

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
        Edit Profile
      </Button>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Profile
      </Heading>

      <DataList.Root>
        {[
          ['ID', profile.data.id],
          ['Type', profile.data.type],
          ['Slug', profile.data.slug],
          ['Name', profile.data.name],
          ['Description', profile.data.description],
          ['Is Customized', String(profile.data.isCustomized)],
          ['Is Metorial', String(profile.data.isMetorial)],
          ['Is Official', String(profile.data.isOfficial)],
          ['Is Verified', String(profile.data.isVerified)],
          ['Created At', profile.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', profile.data.updatedAt.toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      {/* 
      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Readme
      </Heading>

      <CodeBlock
        language="markdown"
        code={profile.data.r || 'No readme provided.'}
        variant="seamless"
        padding="20px"
        style={{ borderRadius: 6 }}
      /> */}
    </>
  ));
};
