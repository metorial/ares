import type { UserEmail } from '../../../prisma/generated';

export let userEmailPresenter = (userEmail: UserEmail) => ({
  object: 'ares#user.email',

  id: userEmail.id,
  userId: userEmail.userId,

  email: userEmail.email,
  normalizedEmail: userEmail.normalizedEmail,

  isPrimary: userEmail.isPrimary,

  createdAt: userEmail.createdAt,
  verifiedAt: userEmail.verifiedAt,
  updatedAt: userEmail.updatedAt
});
