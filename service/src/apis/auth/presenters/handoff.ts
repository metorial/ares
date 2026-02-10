import type { HandoffApplication, HandoffAuthentication } from '../../../prisma/generated';

export let handoffApplicationPresenter = (application: HandoffApplication) => ({
  object: 'ares#handoff.application',

  id: application.id,
  clientId: application.clientId,
  name: application.name,
  redirectUris: application.redirectUris,
  createdAt: application.createdAt
});

export let handoffAuthenticationPresenter = (
  authentication: HandoffAuthentication & {
    application: HandoffApplication;
  }
) => ({
  object: 'ares#handoff.authentication',

  id: authentication.id,
  application: handoffApplicationPresenter(authentication.application),
  createdAt: authentication.createdAt
});
