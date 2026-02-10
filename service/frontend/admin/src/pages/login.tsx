import { getFederationConfig } from '@metorial-enterprise/federation-frontend-config';
import { useForm, useMutation } from '@metorial/data-hooks';
import { Button, Input, Or, Spacer } from '@metorial/ui';
import { useEffect } from 'react';
import { bootState } from '../state';
import { adminClient } from '../state/client';

export let LoginPage = () => {
  let boot = bootState.use({});

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

  useEffect(() => {
    if (boot.data?.method != 'google') return;

    window.location.replace(
      `${new URL(getFederationConfig().urls.apis.admin).origin}/auth/google?redirect_url=${encodeURIComponent(
        `${window.location.origin}/users`
      )}`
    );
  }, [boot.data]);

  useEffect(() => {
    if (boot.data?.method != 'sso') return;

    window.location.replace(
      `${new URL(getFederationConfig().urls.apis.admin).origin}/auth/sso?redirect_url=${encodeURIComponent(
        `${window.location.origin}/users`
      )}`
    );
  }, [boot.data]);

  if (import.meta.env.PROD && boot.data?.method != 'password') return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {boot.data?.method == 'google' && (
          <>
            <div>
              <a
                href={`${new URL(getFederationConfig().urls.apis.admin).origin}/auth/google?redirect_url=${encodeURIComponent(
                  `${window.location.origin}/users`
                )}`}
              >
                <Button as="span" disabled={mutation.isLoading}>
                  Login with Google
                </Button>
              </a>
            </div>

            <Spacer height={25} />

            <Or />

            <Spacer height={25} />
          </>
        )}

        {boot.data?.method == 'sso' && (
          <>
            <div>
              <a
                href={`${new URL(getFederationConfig().urls.apis.admin).origin}/auth/sso?redirect_url=${encodeURIComponent(
                  `${window.location.origin}/users`
                )}`}
              >
                <Button as="span" disabled={mutation.isLoading}>
                  Login with SSO
                </Button>
              </a>
            </div>

            <Spacer height={25} />

            <Or />

            <Spacer height={25} />
          </>
        )}

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
