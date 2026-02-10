import type { User, UserIdentity, UserIdentityProvider } from '../../../../prisma/generated/client';
import { userIdentityProviderPresenter } from './userIdentityProvider';

export let userIdentityPresenter = (
  userIdentity: UserIdentity & { provider: UserIdentityProvider; user: User | null }
) => ({
  object: 'ares#user.identity',

  id: userIdentity.id,
  userId: userIdentity.user?.id ?? null,

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
