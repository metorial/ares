import type { UserIdentity, UserIdentityProvider } from '../../../prisma/generated';
import { userIdentityProviderPresenter } from './userIdentityProvider';

export let userIdentityPresenter = (
  userIdentity: UserIdentity & { provider: UserIdentityProvider }
) => ({
  object: 'ares#user.identity',

  id: userIdentity.id,
  userId: userIdentity.userId,

  provider: userIdentityProviderPresenter(userIdentity.provider),

  providerInfo: {
    id: userIdentity.uid,
    name: userIdentity.name,
    firstName: userIdentity.firstName,
    lastName: userIdentity.lastName,
    email: userIdentity.email,
    photoUrl: userIdentity.photoUrl
  },

  createdAt: userIdentity.createdAt,
  updatedAt: userIdentity.updatedAt
});
