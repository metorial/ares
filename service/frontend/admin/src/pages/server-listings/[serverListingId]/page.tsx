import { CodeBlock } from '@metorial/code';
import { renderWithLoader, useForm, useMutation } from '@metorial/data-hooks';
import {
  Button,
  Checkbox,
  Dialog,
  Input,
  showModal,
  Spacer,
  TextArrayInput
} from '@metorial/ui';
import { DataList, Heading } from '@radix-ui/themes';
import { useParams } from 'react-router-dom';
import { serverListingState } from '../../../state';
import { uploadFileToCloudinary } from '../../../state/cloudinary';

export let ServerListingPage = () => {
  let { serverListingId } = useParams();
  let serverListing = serverListingState.use({ id: serverListingId! });

  return renderWithLoader({ serverListing })(({ serverListing }) => (
    <>
      <Heading as="h1" size="7">
        {serverListing.data.name}
      </Heading>

      <Spacer size={15} />

      <Button
        size="2"
        onClick={() =>
          showModal(({ dialogProps, close }) => {
            let update = useMutation(serverListing.mutators.update);

            let form = useForm({
              initialValues: {
                name: serverListing.data.name,
                slug: serverListing.data.slug,
                readme: serverListing.data.readme || '',
                rank: serverListing.data.rank,
                description: serverListing.data.description || '',
                isVerified: serverListing.data.isVerified,
                isOfficial: serverListing.data.isOfficial,
                isMetorial: serverListing.data.isMetorial,
                isPublic: serverListing.data.isPublic,
                imageUrl:
                  serverListing.data.image?.type == 'url'
                    ? serverListing.data.image.url
                    : undefined,
                skills: serverListing.data.skills,
                categories: serverListing.data.categories.map(c => c.slug)
              },
              onSubmit: async values => {
                await update.mutate({
                  ...values,
                  categories: values.categories.length ? values.categories : undefined,
                  imageUrl: values.imageUrl || undefined
                });
                close();
              },
              schema: yup =>
                yup.object({
                  name: yup.string().required(),
                  slug: yup.string().required(),
                  readme: yup.string().required(),
                  description: yup.string().required(),
                  isVerified: yup.boolean().required(),
                  isOfficial: yup.boolean().required(),
                  isMetorial: yup.boolean().required(),
                  isPublic: yup.boolean().required(),
                  rank: yup.number().required(),
                  imageUrl: yup.string().url().optional(),
                  skills: yup.array(yup.string().required()).required(),
                  categories: yup.array(yup.string().required()).required()
                })
            });

            return (
              <Dialog.Wrapper {...dialogProps}>
                <Dialog.Title>Edit Server Listing</Dialog.Title>

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

                  <Input label="Name" {...form.getFieldProps('name')} />
                  <form.RenderError field="name" />

                  <Spacer size={15} />

                  <Input label="Slug" {...form.getFieldProps('slug')} />
                  <form.RenderError field="slug" />

                  <Spacer size={15} />

                  <Input
                    label="Description"
                    {...form.getFieldProps('description')}
                    as="textarea"
                    minRows={5}
                  />
                  <form.RenderError field="description" />

                  <Spacer size={15} />

                  <Input
                    label="Readme"
                    {...form.getFieldProps('readme')}
                    as="textarea"
                    minRows={10}
                  />
                  <form.RenderError field="readme" />

                  <Spacer size={15} />

                  <Input label="Rank" {...form.getFieldProps('rank')} type="number" />
                  <form.RenderError field="rank" />

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

                  <Checkbox
                    label="Is Public"
                    checked={form.values.isPublic}
                    onCheckedChange={checked =>
                      form.setFieldValue('isPublic', checked === true)
                    }
                  />
                  <form.RenderError field="isPublic" />

                  <Spacer size={15} />

                  <TextArrayInput
                    label="Skills"
                    value={form.values.skills}
                    onChange={value => form.setFieldValue('skills', value)}
                    placeholder="Enter skill and press enter"
                  />
                  <form.RenderError field="skills" />

                  <Spacer size={15} />

                  <TextArrayInput
                    label="Categories"
                    value={form.values.categories}
                    onChange={value => form.setFieldValue('categories', value)}
                    placeholder="Enter category slug and press enter"
                  />
                  <form.RenderError field="categories" />

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
        Edit Server Listing
      </Button>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Server Listing
      </Heading>

      <DataList.Root>
        {[
          ['ID', serverListing.data.id],
          ['Slug', serverListing.data.slug],
          ['Name', serverListing.data.name],
          ['Description', serverListing.data.description],
          ['Rank', serverListing.data.rank],
          ['Is Customized', String(serverListing.data.isCustomized)],
          ['Is Metorial', String(serverListing.data.isMetorial)],
          ['Is Official', String(serverListing.data.isOfficial)],
          ['Is Verified', String(serverListing.data.isVerified)],
          ['Is Public', String(serverListing.data.isPublic)],
          ['Created At', serverListing.data.createdAt.toLocaleDateString('de-at')],
          ['Updated At', serverListing.data.updatedAt.toLocaleDateString('de-at')]
        ].map(([label, value]) => (
          <DataList.Item key={label}>
            <DataList.Label>{label}</DataList.Label>
            <DataList.Value>{value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Heading as="h2" size="4" style={{ marginBottom: 10, marginTop: 20 }}>
        Readme
      </Heading>

      <CodeBlock
        language="markdown"
        code={serverListing.data.readme || '*No Readme*'}
        variant="seamless"
        padding="20px"
      />
    </>
  ));
};
