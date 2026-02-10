import {
  badRequestError,
  conflictError,
  notFoundError,
  preconditionFailedError,
  ServiceError
} from '@lowerdeck/error';
import { generatePlainId } from '@lowerdeck/id';
import { Service } from '@lowerdeck/service';
import type { App, User, UserEmail } from '../../prisma/generated/client';
import { addAfterTransactionHook, db, withTransaction } from '../db';
import { sendEmailVerification } from '../email/emailVerification';
import { userEvents } from '../events/user';
import { getId } from '../id';
import type { Context } from '../lib/context';
import { parseEmail } from '../lib/parseEmail';

class UserServiceImpl {
  async findByEmailSafe(i: { email: string; app: App }) {
    return await db.user.findFirst({
      where: {
        appOid: i.app.oid,
        OR: [
          { email: i.email },
          {
            userEmails: {
              some: {
                email: i.email,
                verifiedAt: { not: null }
              }
            }
          }
        ]
      }
    });
  }

  async findByEmail(i: { email: string; app: App }) {
    let user = await this.findByEmailSafe(i);
    if (!user) throw new ServiceError(notFoundError('user', null));
    return user;
  }

  async createUser(i: {
    email: string;
    firstName: string;
    lastName: string;
    acceptedTerms: boolean;
    context: Context;
    app: App;
    type: 'standard_user' | 'pre_created_user';
  }) {
    if (!i.acceptedTerms) {
      throw new ServiceError(
        badRequestError({
          message: 'You must accept the terms of service'
        })
      );
    }

    return withTransaction(async tdb => {
      try {
        let user = await tdb.user.create({
          data: {
            ...getId('user'),

            email: i.email,
            name: `${i.firstName} ${i.lastName}`.trim(),
            firstName: i.firstName,
            lastName: i.lastName,

            type: 'user',
            owner: 'self',
            status: 'active',
            appOid: i.app.oid,
            tenantOid: i.app.defaultTenantOid!,

            isFullyCreated: i.type === 'standard_user',

            image: { type: 'default' }
          }
        });

        await this.createEmail({
          email: i.email,
          user,
          app: i.app,
          context: i.context,
          isForNewUser: true
        });

        addAfterTransactionHook(() => userEvents.fire('create', user));

        return user;
      } catch (e: any) {
        console.error('Error creating user:', e);

        if (e.code === 'P2002') {
          throw new ServiceError(
            conflictError({
              message: 'This email is already in use'
            })
          );
        }

        throw e;
      }
    });
  }

  async listUserProfile(i: { user: User }) {
    return await db.userIdentity.findMany({
      where: { userOid: i.user.oid },
      orderBy: {
        id: 'asc'
      },
      include: {
        provider: true
      }
    });
  }

  async listUserEmails(i: { user: User }) {
    return await db.userEmail.findMany({
      where: { userOid: i.user.oid },
      orderBy: {
        id: 'asc'
      }
    });
  }

  async createEmail(i: {
    email: string;
    user: User;
    app: App;
    context: Context;
    isForNewUser?: boolean;
  }) {
    let existingEmail = await db.userEmail.findFirst({
      where: {
        appOid: i.app.oid,
        email: i.email
      }
    });
    if (existingEmail) {
      if (existingEmail.userOid === i.user.oid) {
        throw new ServiceError(
          conflictError({
            message: 'This email is already associated with your account'
          })
        );
      }

      throw new ServiceError(
        conflictError({
          message: 'This email is already in use'
        })
      );
    }

    return withTransaction(async tdb => {
      let parsedEmail = parseEmail(i.email);

      // Ensure email domain exists
      let domain = await tdb.emailDomain.upsert({
        where: {
          domain: parsedEmail.domain
        },
        create: {
          ...getId('emailDomain' as any),
          domain: parsedEmail.domain,
          appOid: i.app.oid
        },
        update: {}
      });

      let email = await tdb.userEmail.create({
        data: {
          ...getId('userEmail'),
          domainOid: domain.oid,
          appOid: i.app.oid,
          email: parsedEmail.email,
          normalizedEmail: parsedEmail.normalizedEmail,
          isPrimary: i.isForNewUser,
          verifiedAt: i.isForNewUser ? new Date() : null,
          userOid: i.user.oid
        }
      });

      if (!email.verifiedAt) {
        await this.sendUserEmailVerification({ email });
      }

      return email;
    });
  }

  async verifyUserEmail(i: { key: string }) {
    let verification = await db.userEmailVerification.findFirst({
      where: { key: i.key }
    });

    if (!verification) {
      throw new ServiceError(
        notFoundError({
          entity: 'user_email_verification',
          message: 'This verification link is invalid, has expired, or has already been used'
        })
      );
    }

    if (verification?.completedAt) {
      throw new ServiceError(
        conflictError({
          message: 'You have already verified this email'
        })
      );
    }

    return await withTransaction(async tdb => {
      await tdb.userEmailVerification.update({
        where: { key: i.key },
        data: { completedAt: new Date() }
      });

      return await tdb.userEmail.update({
        where: { oid: verification.userEmailOid },
        data: { verifiedAt: new Date() }
      });
    });
  }

  async sendUserEmailVerification(i: { email: UserEmail }) {
    return withTransaction(async tdb => {
      let verification = await tdb.userEmailVerification.create({
        data: {
          ...getId('userEmailVerification'),
          key: generatePlainId(30),
          userOid: i.email.userOid,
          userEmailOid: i.email.oid
        }
      });

      await sendEmailVerification.send({
        to: [i.email.email],
        data: { key: verification.key, userEmailId: i.email.id }
      });
    });
  }

  async setPrimaryEmail(i: { email: UserEmail; user: User; context: Context }) {
    if (i.email.userOid !== i.user.oid) throw new Error('WTF');
    if (i.email.isPrimary) return i.email;
    if (!i.email.verifiedAt) {
      throw new ServiceError(
        preconditionFailedError({
          message: 'Email must be verified before setting as primary'
        })
      );
    }

    return withTransaction(async tdb => {
      // Set all emails to not primary
      await tdb.userEmail.updateMany({
        where: { userOid: i.user.oid },
        data: { isPrimary: false }
      });

      let email = await tdb.userEmail.update({
        where: { id: i.email.id },
        data: { isPrimary: true }
      });

      let user = await tdb.user.update({
        where: { oid: i.user.oid },
        data: { email: i.email.email }
      });

      await addAfterTransactionHook(() => userEvents.fire('update', user!));

      return email;
    });
  }

  async deleteEmail(i: { email: UserEmail; user: User; context: Context }) {
    if (i.email.userOid !== i.user.oid) throw new Error('WTF');
    if (i.email.isPrimary) {
      throw new ServiceError(
        badRequestError({
          message: 'Primary email cannot be removed'
        })
      );
    }

    return withTransaction(async tdb => {
      let email = await tdb.userEmail.delete({ where: { id: i.email.id } });

      return email;
    });
  }

  // Terms agreement removed - implement if needed with proper types

  async updateUser(i: {
    user: User;
    context: Context;
    input: {
      firstName?: string;
      lastName?: string;
      name?: string;
      image?: any; // Use any for now, can be typed properly later
    };
  }) {
    return withTransaction(async tdb => {
      let user = await tdb.user.update({
        where: { oid: i.user.oid },
        data: {
          firstName: i.input.firstName,
          lastName: i.input.lastName,
          name: i.input.name,
          image: i.input.image
        }
      });

      await addAfterTransactionHook(() => userEvents.fire('update', user!));

      return user;
    });
  }

  async deleteUser(i: { user: User; context: Context }) {
    return withTransaction(async tdb => {
      let user = await tdb.user.update({
        where: { oid: i.user.oid },
        data: {
          deletedAt: new Date(),
          status: 'deleted',
          name: `[DELETED]`,
          firstName: `[DELETED]`,
          lastName: ``,
          email: `deleted_${i.user.oid}@deleted.local`
        }
      });

      await addAfterTransactionHook(() => userEvents.fire('delete', user!));

      await tdb.userEmail.deleteMany({
        where: { userOid: i.user.oid }
      });

      await tdb.authDeviceUserSession.updateMany({
        where: { userOid: i.user.oid },
        data: {
          loggedOutAt: new Date(),
          expiresAt: new Date()
        }
      });

      // Get rid of auth sessions to avoid any potential issues (e.g., logging in with the deleted user)
      await tdb.authIntent.deleteMany({ where: { userOid: i.user.oid } });
      await tdb.authAttempt.deleteMany({ where: { userOid: i.user.oid } });
    });
  }

  async getUser(i: { userId: string }) {
    let user = await db.user.findUnique({
      where: { id: i.userId },
      include: { userEmails: true }
    });
    if (!user) throw new ServiceError(notFoundError('user', i.userId));

    return user;
  }

  async getManyUsersAsMap({ userIds }: { userIds: string[] }) {
    let users = await db.user.findMany({
      where: {
        id: { in: userIds }
      }
    });

    return new Map(users.map(user => [user.id, user]));
  }
}

export let userService = Service.create('UserService', () => new UserServiceImpl()).build();
