import { useForm, useMutation } from '@metorial-io/data-hooks';
import { Button, Input, Or, Spacer } from '@metorial-io/ui';
import { adminClient } from '../state/client';

export let LoginPage = () => {
  let mutation = useMutation(adminClient.authentication.login);

  let form = useForm({
    initialValues: {
      email: '',
      password: ''
    },
    schema: yup =>
      yup.object({
        email: yup.string().email().required(),
        password: yup.string().required()
      }),
    onSubmit: async ({ email, password }) => {
      let [res] = await mutation.mutate({ email, password });
      if (res) window.location.href = '/users';
    }
  });

  let googleAuthUrl = `/auth/google?redirect_url=${encodeURIComponent(`${window.location.origin}/users`)}`;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div>
          <a href={googleAuthUrl}>
            <Button as="span" disabled={mutation.isLoading}>
              Login with Google
            </Button>
          </a>
        </div>

        <Spacer height={25} />
        <Or />
        <Spacer height={25} />

        <form onSubmit={form.handleSubmit} style={{ width: 300 }}>
          <Input {...form.getFieldProps('email')} label="Email" type="email" />
          <form.RenderError field="email" />

          <Spacer height={15} />

          <Input {...form.getFieldProps('password')} label="Password" type="password" />
          <form.RenderError field="password" />

          <Spacer height={15} />

          <Button type="submit" loading={mutation.isLoading} success={mutation.isSuccess}>
            Login with Email
          </Button>
          <mutation.RenderError />
        </form>
      </div>
    </div>
  );
};
