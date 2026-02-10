import { useMutation } from '@metorial/data-hooks';
import { Button, Spacer } from '@metorial/ui';
import { Box } from '@metorial/ui-product';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authConfigState } from '../state';

export let AuthConfigPage = () => {
  let authConfig = authConfigState.use();
  let update = useMutation(authConfig.mutators.update);
  let getSsoSetupUrl = useMutation(authConfig.mutators.getSsoSetupUrl);
  let setSsoTenantForAuth = useMutation(authConfig.mutators.setSsoTenantForAuth);
  let setSsoTenantForAdminAuth = useMutation(authConfig.mutators.setSsoTenantForAdminAuth);

  let [searchParams] = useSearchParams();
  let ssoSetup = searchParams.get('sso_setup');
  let tenantId = searchParams.get('tenant_id');

  let settingUpSsoRef = useRef(false);
  useEffect(() => {
    if (ssoSetup && tenantId && !settingUpSsoRef.current) {
      settingUpSsoRef.current = true;

      (async () => {
        if (ssoSetup === 'user') {
          await setSsoTenantForAuth.mutate({ tenantId });
        } else if (ssoSetup === 'admin') {
          await setSsoTenantForAdminAuth.mutate({ tenantId });
          window.location.pathname = '/login';
        }
      })();
    }
  });

  // let form = useForm({
  //   initialValues: {
  //     hasWhitelist: !!authConfig.data?.hasWhitelist
  //   },
  //   updateInitialValues: true,
  //   schema: yup =>
  //     yup.object({
  //       hasWhitelist: yup.boolean()
  //     }),
  //   onSubmit: async values => {
  //     await update.mutate({
  //       hasWhitelist: !!values.hasWhitelist
  //     });
  //   }
  // });

  return (
    <>
      {/* <Box
        title="Authentication Configuration"
        description="Configure authentication settings for your Metorial instance."
      >
        <form onSubmit={form.handleSubmit}>
          <Switch
            label="Has Whitelist"
            checked={form.values.hasWhitelist}
            onCheckedChange={v => form.setFieldValue('hasWhitelist', v)}
          />

          <Spacer size={15} />

          <Button size="2" type="submit" loading={update.isLoading} success={update.isSuccess}>
            Save
          </Button>
        </form>
      </Box>

      <Spacer size={20} /> */}

      <Box
        title="User SSO Configuration"
        description="Configure SSO settings for normal user authentication."
      >
        <Button
          size="2"
          type="button"
          onClick={async () => {
            let url = new URL(window.location.href);
            url.searchParams.set('sso_setup', 'user');
            let [res] = await getSsoSetupUrl.mutate({
              tenantName: 'User SSO',
              redirectUri: url.toString()
            });
            if (res) window.location.href = res;
          }}
        >
          Configure SSO for <u>Normal Users</u>
        </Button>
      </Box>

      <Spacer size={20} />

      <Box
        title="Admin SSO Configuration"
        description="Configure SSO settings for admin authentication."
      >
        <Button
          size="2"
          type="button"
          onClick={async () => {
            let url = new URL(window.location.href);
            url.searchParams.set('sso_setup', 'admin');
            let [res] = await getSsoSetupUrl.mutate({
              tenantName: 'Admin SSO',
              redirectUri: url.toString()
            });
            if (res) window.location.href = res;
          }}
        >
          Configure SSO for <u>Admin Users</u>
        </Button>
      </Box>
    </>
  );
};
