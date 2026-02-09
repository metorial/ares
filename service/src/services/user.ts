import { auditLogService } from '@metorial-enterprise/federation-audit-log';
import {
  addAfterTransactionHook,
  deletedEmail,
  ensureEmailDomain,
  EnterpriseUser,
  federationDB,
  FederationID,
  UserEmail,
  UserTermsType,
  withTransaction
} from '@metorial-enterprise/federation-data';
import { internalNotificationService } from '@metorial-enterprise/federation-internal-notifications';
import { EntityImage, islandUserService } from '@metorial-enterprise/federation-islands';
import { Context } from '@metorial/context';
import {
  badRequestError,
  conflictError,
  notFoundError,
  preconditionFailedError,
  ServiceError
} from '@metorial/error';
import { generatePlainId } from '@metorial/id';
import { Service } from '@metorial/service';
import { authConfig, authTenant, terms } from '../definitions';
import { sendEmailVerification } from '../email/emailVerification';
import { userEvents } from '../events/user';
import { parseEmail } from '../lib/parseEmail';
import { createCompanyPeopleQueue } from '../queues/createCompanyPeople';

let whitelistExempt = ['@metorial.com', '@herber.space', '@ycombinator.com'];

class UserServiceImpl {
  async findByEmailSafe(i: { email: string }) {
    return await federationDB.enterpriseUser.findFirst({
      where: {
        OR: [
          { email: i.email },
          {
            emails: {
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

  async findByEmail(i: { email: string }) {
    let user = await this.findByEmailSafe(i);
    if (!user) throw new ServiceError(notFoundError('user', null));
  }

  async createUser(i: {
    email: string;
    firstName: string;
    lastName: string;
    acceptedTerms: boolean;
    context: Context;
    type: 'standard_user' | 'pre_created_user';
  }) {
    if (!i.acceptedTerms) {
      throw new ServiceError(
        badRequestError({
          message: 'You must accept the terms of service'
        })
      );
    }

    let config = await authConfig();
    if (
      process.env.METORIAL_ENV == 'staging' &&
      config.hasWhitelist &&
      !whitelistExempt.some(domain => i.email.endsWith(domain))
    ) {
      let invite = await federationDB.userInvite.findFirst({
        where: { email: i.email }
      });

      if (!invite) {
        throw new ServiceError(
          badRequestError({
            message: `You don't have access to Metorial yet. Visit metorial.com/early-access to request access.`
          })
        );
      }
    }

    return withTransaction(async db => {
      try {
        let user = await db.enterpriseUser.create({
          data: {
            id: await FederationID.generateId('user'),

            email: i.email,
            name: `${i.firstName} ${i.lastName}`.trim(),
            firstName: i.firstName,
            lastName: i.lastName,

            type: 'user',
            owner: 'self',
            status: 'active',
            tenantId: (await authTenant).id,

            isFullyCreated: i.type === 'standard_user',

            image: { type: 'default' }
          }
        });

        await islandUserService.createUser({ user, context: i.context });

        await this.createEmail({
          email: i.email,
          user,
          context: i.context,
          isForNewUser: true
        });

        await this.createTermsAgreement({
          user,
          context: i.context,
          terms: [terms.privacyPolicy, terms.termsOfService]
        });

        await db.userInvite.updateMany({
          where: { email: i.email },
          data: { status: 'accepted' }
        });

        await auditLogService.createAuditLog({
          object: 'user',
          action: 'create',
          actor: { type: 'user', user },
          target: user
        });

        addAfterTransactionHook(() => userEvents.fire('create', user));

        await auditLogService.createAuditLog({
          object: 'user',
          action: 'create',
          target: { id: user.id, name: user.name },
          actor: { type: 'user', user },
          context: i.context,
          payload: { userId: user.id }
        });

        await internalNotificationService.internalNotification({
          actor: { type: 'user', user },
          text: `New user signed up: ${user.name} (${user.email})`,
          data: {
            'User ID': user.id,
            Name: user.name,
            Email: user.email
          }
        });

        createCompanyPeopleQueue.add({ userId: user.id });

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

  async listUserProfile(i: { user: EnterpriseUser }) {
    return await federationDB.userIdentity.findMany({
      where: { userId: i.user.id },
      orderBy: {
        id: 'asc'
      },
      include: {
        provider: true
      }
    });
  }

  async listUserEmails(i: { user: EnterpriseUser }) {
    return await federationDB.userEmail.findMany({
      where: { userId: i.user.id },
      orderBy: {
        id: 'asc'
      }
    });
  }

  async createEmail(i: {
    email: string;
    user: EnterpriseUser;
    context: Context;
    isForNewUser?: boolean;
  }) {
    let existingEmail = await federationDB.userEmail.findUnique({
      where: { email: i.email }
    });
    if (existingEmail) {
      if (existingEmail.userId === i.user.id) {
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

    return withTransaction(async db => {
      let parsedEmail = parseEmail(i.email);

      let domain = await ensureEmailDomain(() => ({
        domain: parsedEmail.domain
      }));

      let email = await db.userEmail.create({
        data: {
          id: await FederationID.generateId('userEmail'),
          domainId: domain.id,
          email: parsedEmail.email,
          normalizedEmail: parsedEmail.normalizedEmail,
          isPrimary: i.isForNewUser,
          verifiedAt: i.isForNewUser ? new Date() : null,
          userId: i.user.id
        }
      });

      if (!email.verifiedAt) {
        await this.sendUserEmailVerification({ email });
      }

      await auditLogService.createAuditLog({
        object: 'user_email',
        action: 'create',
        target: { id: email.id, name: email.email },
        actor: { type: 'user', user: i.user },
        context: i.context,
        payload: { email: email.email }
      });

      return email;
    });
  }

  async verifyUserEmail(i: { key: string; userEmailId: string }) {
    let verification = await federationDB.userEmailVerification.findUnique({
      where: { key: i.key, userEmailId: i.userEmailId }
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

    return await withTransaction(async db => {
      await db.userEmailVerification.update({
        where: { key: i.key },
        data: { completedAt: new Date() }
      });

      return await db.userEmail.update({
        where: { id: verification.userEmailId },
        data: { verifiedAt: new Date() }
      });
    });
  }

  async sendUserEmailVerification(i: { email: UserEmail }) {
    return withTransaction(async db => {
      let verification = await db.userEmailVerification.create({
        data: {
          id: await FederationID.generateId('userEmailVerification'),
          key: generatePlainId(30),
          userId: i.email.userId,
          userEmailId: i.email.id
        }
      });

      await sendEmailVerification.send({
        to: [i.email.email],
        data: { key: verification.key, userEmailId: i.email.id }
      });
    });
  }

  async setPrimaryEmail(i: { email: UserEmail; user: EnterpriseUser; context: Context }) {
    if (i.email.userId !== i.user.id) throw new Error('WTF');
    if (i.email.isPrimary) return i.email;
    if (!i.email.verifiedAt) {
      throw new ServiceError(
        preconditionFailedError({
          message: 'Email must be verified before setting as primary'
        })
      );
    }

    return withTransaction(async db => {
      // Set all emails to not primary
      await db.userEmail.updateMany({
        where: { userId: i.user.id },
        data: { isPrimary: false }
      });

      let email = await db.userEmail.update({
        where: { id: i.email.id },
        data: { isPrimary: true }
      });

      let user = await db.enterpriseUser.update({
        where: { id: i.user.id },
        data: { email: i.email.email }
      });

      await addAfterTransactionHook(() => userEvents.fire('update', user!));

      await auditLogService.createAuditLog({
        object: 'user_email',
        action: 'update',
        target: { id: email.id, name: email.email },
        actor: { type: 'user', user: i.user },
        context: i.context,
        payload: { email: email.email, isPrimary: true }
      });
      await auditLogService.createAuditLog({
        object: 'user',
        action: 'update',
        target: { id: user.id, name: user.name },
        actor: { type: 'user', user: i.user },
        context: i.context,
        payload: { email: i.email.email }
      });

      return email;
    });
  }

  async deleteEmail(i: { email: UserEmail; user: EnterpriseUser; context: Context }) {
    if (i.email.userId !== i.user.id) throw new Error('WTF');
    if (i.email.isPrimary) {
      throw new ServiceError(
        badRequestError({
          message: 'Primary email cannot be removed'
        })
      );
    }

    return withTransaction(async db => {
      let email = await db.userEmail.delete({ where: { id: i.email.id } });

      await auditLogService.createAuditLog({
        object: 'user_email',
        action: 'delete',
        target: { id: email.id, name: email.email },
        actor: { type: 'user', user: i.user },
        context: i.context,
        payload: { email: email.email }
      });

      return email;
    });
  }

  async createTermsAgreement(i: {
    user: EnterpriseUser;
    terms: (UserTermsType | Promise<UserTermsType>)[];
    context: Context;
  }) {
    return withTransaction(async db => {
      for (let termProm of i.terms) {
        let term = await termProm;

        await db.userTermsAgreement.create({
          data: {
            id: await FederationID.generateId('userTermsAgreement'),
            userId: i.user.id,
            typeId: term.id,
            ip: i.context.ip,
            ua: i.context.ua
          }
        });

        await auditLogService.createAuditLog({
          object: 'user_terms_agreement',
          action: 'create',
          target: { id: i.user.id, name: i.user.name },
          actor: { type: 'user', user: i.user },
          context: i.context,
          payload: { terms: term.identifier, version: term.version }
        });
      }
    });
  }

  async updateUser(i: {
    user: EnterpriseUser;
    context: Context;
    input: {
      firstName?: string;
      lastName?: string;
      name?: string;
      image?: EntityImage;
    };
  }) {
    // if (
    //   (!i.input.firstName && !i.input.lastName && !i.input.name) ||
    //   (i.input.firstName === i.user.firstName &&
    //     i.input.lastName === i.user.lastName &&
    //     i.input.name === i.user.name) ||
    //   (i.input.imageFileId === null && i.user.image?.type === 'default') ||
    //   (i.user.image?.type === 'enterprise_file' &&
    //     i.input.imageFileId === i.user.image?.fileId)
    // ) {
    //   return i.user;
    // }

    return withTransaction(async db => {
      let user = await db.enterpriseUser.update({
        where: { id: i.user.id },
        data: {
          firstName: i.input.firstName,
          lastName: i.input.lastName,
          name: i.input.name,
          image: i.input.image
        }
      });

      await islandUserService.updateUser({ user, context: i.context });

      await addAfterTransactionHook(() => userEvents.fire('update', user!));

      // await auditLogService.createAuditLog({
      //   object: 'user',
      //   action: 'update',
      //   target: { id: user.id, name: user.name },
      //   actor: { type: 'user', user },
      //   context: i.context,
      //   payload: {
      //     firstName: i.input.firstName,
      //     lastName: i.input.lastName,
      //     name: i.input.name
      //   }
      // });

      return user;
    });
  }

  async deleteUser(i: { user: EnterpriseUser; context: Context }) {
    return withTransaction(async db => {
      // await this.createUserAction({
      //   user: i.user,
      //   action: EnterpriseUserActionType.user_delete,
      //   context: i.context
      // });

      let user = await db.enterpriseUser.update({
        where: { id: i.user.id },
        data: {
          deletedAt: new Date(),
          name: `[DELETED]`,
          firstName: `[DELETED]`,
          lastName: ``,
          email: deletedEmail.delete(i.user.email)
        }
      });

      await addAfterTransactionHook(() => userEvents.fire('delete', user!));

      await db.userEmail.deleteMany({
        where: { userId: i.user.id }
      });

      await db.authDeviceUserSession.updateMany({
        where: { userId: i.user.id },
        data: {
          loggedOutAt: new Date(),
          expiresAt: new Date()
        }
      });

      // Get rid of auth sessions to avoid any potential issues (e.g., logging in with the deleted user)
      await db.authIntent.deleteMany({ where: { userId: i.user.id } });
      await db.authAttempt.deleteMany({ where: { userId: i.user.id } });
    });
  }

  async getUser(i: { userId: string }) {
    let user = await federationDB.enterpriseUser.findUnique({
      where: { id: i.userId },
      include: { emails: true }
    });
    if (!user) throw new ServiceError(notFoundError('user', i.userId));

    return user;
  }

  async getManyUsersAsMap({ userIds }: { userIds: string[] }) {
    let users = await federationDB.enterpriseUser.findMany({
      where: {
        id: { in: userIds }
      }
    });

    return new Map(users.map(user => [user.id, user]));
  }
}

export let userService = Service.create('UserService', () => new UserServiceImpl()).build();
