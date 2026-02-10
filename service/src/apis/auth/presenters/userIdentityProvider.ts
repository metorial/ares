import type { UserIdentityProvider } from '../../../prisma/generated';

export let userIdentityProviderPresenter = (provider: UserIdentityProvider) => ({
  object: 'ares#user.identity.provider',

  id: provider.id,

  identifier: provider.identifier,
  name: provider.name,

  createdAt: provider.createdAt
});
