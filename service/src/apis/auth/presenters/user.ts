import type { User } from '../../../prisma/generated';
import { deletedEmail } from '../../../lib/deletedEmail';
import { getImageUrl } from '../../../lib/getImageUrl';

export let userPresenter = async (user: User) => ({
  object: 'ares#user',

  status: user.deletedAt ? 'deleted' : 'active',

  id: user.id,

  email: user.deletedAt ? deletedEmail.restoreAnonymized(user.email) : user.email,
  name: user.name,
  firstName: user.firstName,
  lastName: user.lastName,

  lastLoginAt: user.lastLoginAt,
  lastActiveAt: user.lastActiveAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,

  imageUrl: await getImageUrl(user)
});
