import { auditLogService } from '@metorial-enterprise/federation-audit-log';
import {
  AuthDevice,
  AuthIntent,
  AuthIntentStep,
  ensureUserIdentityProvider,
  EnterpriseUser,
  federationDB,
  FederationID,
  UserImpersonation,
  withTransaction
} from '@metorial-enterprise/federation-data';
import { Context } from '@metorial/context';
import { badRequestError, forbiddenError, notFoundError, ServiceError } from '@metorial/error';
import { generateCode } from '@metorial/id';
import { Service } from '@metorial/service';
import { addMinutes, subMinutes } from 'date-fns';
import { authConfig, providers } from '../definitions';
import { sendAuthCodeEmail } from '../email/authCode';
import { successfulLoginVerification } from '../email/successfulLogin';
import { env } from '../env';
import { parseEmail } from '../lib/parseEmail';
import { socials } from '../lib/socials';
import { sso } from '../lib/sso';
import { turnstileVerifier } from '../lib/turnstile';
import { authBlockService } from './authBlock';
import { deviceService } from './device';
import { userService } from './user';

class AuthServiceImpl {
  async getAuthOptions() {
    let config = await authConfig();
    if (config.ssoTenantId) return { options: [{ type: 'sso' }] };

    let options = [{ type: 'email' }];
    if (env.oauth.OAUTH_GITHUB_CLIENT_ID) options.push({ type: 'oauth.github' });
    if (env.oauth.OAUTH_GOOGLE_CLIENT_ID) options.push({ type: 'oauth.google' });

    return {
      options
    };
  }

  async authWithEmail(i: {
    email: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
    captchaToken?: string;
  }) {
    let config = await authConfig();
    if (config.ssoTenantId) return { type: 'sso' as const };

    if (i.captchaToken && !(await turnstileVerifier.verify({ token: i.captchaToken }))) {
      throw new ServiceError(forbiddenError({ message: 'Invalid captcha token' }));
    }

    let email = parseEmail(i.email).email;

    await authBlockService.registerBlock({ email, context: i.context });

    return await withTransaction(async db => {
      let user = await userService.findByEmailSafe({ email });

      if (user) {
        let isLoggedIn = await deviceService.checkIfUserIsLoggedIn({
          user,
          device: i.device
        });

        if (isLoggedIn) {
          return {
            type: 'auth_attempt' as const,
            authAttempt: await this.createAuthAttempt({
              user,
              device: i.device,
              redirectUrl: i.redirectUrl
            })
          };
        }
      }

      let authIntent = await db.authIntent.create({
        data: {
          id: await FederationID.generateId('authIntent'),
          clientSecret: await FederationID.generateId('authIntentClientSecret'),

          type: 'email_code',

          redirectUrl: i.redirectUrl,

          identifier: email,
          identifierType: 'email',

          userId: user?.id,
          deviceId: i.device.id,

          expiresAt: addMinutes(new Date(), 30),

          ...i.context
        }
      });

      await this.createAuthIntentStep({
        type: 'email_code',
        email,
        authIntent,
        index: 0
      });

      if (user) {
        await auditLogService.createAuditLog({
          object: 'user',
          action: 'auth_attempt',
          target: { id: user.id, name: user.name },
          actor: { type: 'user', user },
          context: i.context,
          payload: {}
        });
      }

      return {
        type: 'auth_intent' as const,
        authIntent
      };
    });
  }

  async authWithImpersonationToken(i: {
    impersonationClientSecret: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
  }) {
    let userImpersonation = await federationDB.userImpersonation.findUnique({
      where: { clientSecret: i.impersonationClientSecret },
      include: { user: true }
    });
    if (!userImpersonation || !i.impersonationClientSecret) {
      throw new ServiceError(
        badRequestError({
          message: 'Invalid impersonation token'
        })
      );
    }

    return await withTransaction(async db => {
      return await this.createAuthAttempt({
        user: userImpersonation.user,
        device: i.device,
        redirectUrl: i.redirectUrl,
        userImpersonation
      });
    });
  }

  async getSocialProviderAuthUrl(i: { provider: 'github' | 'google'; state: string }) {
    return socials[i.provider].getAuthUrl(i.state);
  }

  async authWithSocialProviderToken(i: {
    code: string;
    provider: 'github' | 'google';

    context: Context;
    redirectUrl: string;
    device: AuthDevice;
  }) {
    let socialRes = await socials[i.provider].exchangeCodeForData(i.code);

    if (!socialRes.email) {
      throw new ServiceError(
        badRequestError({ message: 'Social provider did not return email address' })
      );
    }

    let provider = await providers[i.provider];

    let userIdentity = await federationDB.userIdentity.findFirst({
      where: { providerId: provider.id, uid: socialRes.id }
    });
    if (!userIdentity) {
      let name = socialRes.name || socialRes.email.split('@')[0];
      let nameParts = name.split(' ');
      let firstName = nameParts[0];
      let lastName = nameParts.slice(1).join(' ');

      userIdentity = await federationDB.userIdentity.create({
        data: {
          id: await FederationID.generateId('userIdentity'),
          uid: socialRes.id,
          email: socialRes.email,
          firstName,
          lastName,
          name,
          photoUrl: socialRes.photoUrl,
          providerId: provider.id
        }
      });
    }

    if (!userIdentity.userId) {
      let user = await userService.findByEmailSafe({
        email: socialRes.email
      });

      if (user) {
        userIdentity = await federationDB.userIdentity.update({
          where: { id: userIdentity.id },
          data: { userId: user.id }
        });
      }
    }

    let user = userIdentity.userId
      ? await federationDB.enterpriseUser.findUnique({ where: { id: userIdentity.userId } })
      : null;

    if (
      user &&
      (await deviceService.checkIfUserIsLoggedIn({
        user,
        device: i.device
      }))
    ) {
      return {
        type: 'auth_attempt' as const,
        authAttempt: await this.createAuthAttempt({
          user,
          device: i.device,
          redirectUrl: i.redirectUrl
        })
      };
    }

    let authIntent = await federationDB.authIntent.create({
      data: {
        id: await FederationID.generateId('authIntent'),
        clientSecret: await FederationID.generateId('authIntentClientSecret'),

        type: 'oauth',
        userIdentityId: userIdentity.id,
        userId: userIdentity.userId,
        deviceId: i.device.id,

        redirectUrl: i.redirectUrl,

        identifier: socialRes.email,
        identifierType: 'email',

        ...i.context,

        verifiedAt: new Date(),
        captchaVerifiedAt: new Date(),
        expiresAt: addMinutes(new Date(), 30)
      }
    });

    return {
      type: 'auth_intent' as const,
      authIntent
    };
  }

  async getSsoAuthUrl(i: { email?: string; state: string; redirectUri: string }) {
    let config = await authConfig();
    if (!config.ssoTenantId) {
      throw new ServiceError(forbiddenError({ message: 'SSO is not configured' }));
    }

    let res = await sso.auth.start({
      tenantId: config.ssoTenantId,
      redirectUri: i.redirectUri,
      state: i.state,
      email: i.email
    });

    return res.url;
  }

  async authWithSsoToken(i: {
    state: string;
    authId: string;

    context: Context;
    redirectUrl: string;
    device: AuthDevice;
  }) {
    let auth = await sso.auth.complete({ authId: i.authId });
    if (auth.auth.state !== i.state) {
      throw new ServiceError(badRequestError({ message: 'Invalid SSO state' }));
    }

    let provider = await ensureUserIdentityProvider(() => ({
      identifier: `sso_${auth.tenant.id}`,
      name: auth.tenant.name
    }));
    let profile = auth.user;

    let userIdentity = await federationDB.userIdentity.findFirst({
      where: { providerId: provider.id, uid: profile.id }
    });
    if (!userIdentity) {
      userIdentity = await federationDB.userIdentity.create({
        data: {
          id: await FederationID.generateId('userIdentity'),
          uid: profile.id,
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          name: profile.firstName + ' ' + profile.lastName,
          providerId: provider.id
        }
      });
    }

    if (!userIdentity.userId) {
      let user = await userService.findByEmailSafe({
        email: profile.email
      });

      if (user) {
        userIdentity = await federationDB.userIdentity.update({
          where: { id: userIdentity.id },
          data: { userId: user.id }
        });
      }
    }

    let user = userIdentity.userId
      ? await federationDB.enterpriseUser.findUnique({ where: { id: userIdentity.userId } })
      : null;

    if (
      user &&
      (await deviceService.checkIfUserIsLoggedIn({
        user,
        device: i.device
      }))
    ) {
      return {
        type: 'auth_attempt' as const,
        authAttempt: await this.createAuthAttempt({
          user,
          device: i.device,
          redirectUrl: i.redirectUrl
        })
      };
    }

    let authIntent = await federationDB.authIntent.create({
      data: {
        id: await FederationID.generateId('authIntent'),
        clientSecret: await FederationID.generateId('authIntentClientSecret'),

        type: 'oauth',
        userIdentityId: userIdentity.id,
        userId: userIdentity.userId,
        deviceId: i.device.id,

        redirectUrl: i.redirectUrl,

        identifier: profile.email,
        identifierType: 'email',

        ...i.context,

        verifiedAt: new Date(),
        captchaVerifiedAt: new Date(),
        expiresAt: addMinutes(new Date(), 30)
      }
    });

    return {
      type: 'auth_intent' as const,
      authIntent
    };
  }

  async createAuthIntentStep(
    i: { type: 'email_code'; email: string } & { authIntent: AuthIntent; index: number }
  ) {
    return await withTransaction(async db => {
      let step = await db.authIntentStep.create({
        data: {
          id: await FederationID.generateId('authIntentStep'),
          authIntentId: i.authIntent.id,
          type: i.type,
          index: i.index,
          email: i.email
        }
      });

      await this.createAuthIntentCode({ step });
    });
  }

  async createAuthIntentCode(i: { step: AuthIntentStep }) {
    if (!i.step.email) throw new Error('Invalid step for code sending');

    await withTransaction(async db => {
      let code = await db.authIntentCode.create({
        data: {
          id: await FederationID.generateId('authIntentCode'),
          authIntentId: i.step.authIntentId,
          stepId: i.step.id,
          email: i.step.email!,
          code: process.env.NODE_ENV == 'development' ? '111111' : generateCode(6)
        }
      });

      await sendAuthCodeEmail.send({
        to: [i.step.email!],
        data: { code: code.code }
      });

      return code;
    });
  }

  async getAuthIntent(i: { authIntentId: string; clientSecret: string }) {
    let authIntent = await federationDB.authIntent.findUnique({
      where: {
        id: i.authIntentId,
        clientSecret: i.clientSecret,
        expiresAt: { gt: new Date() },
        consumedAt: null
      },
      include: {
        steps: { include: { codes: true } },
        userIdentity: true
      }
    });
    if (!authIntent) throw new ServiceError(notFoundError('auth_intent', i.authIntentId));

    return authIntent;
  }

  async resendAuthIntentCode(i: { authIntent: AuthIntent; step: AuthIntentStep }) {
    let codes = await federationDB.authIntentCode.findMany({
      where: { authIntentId: i.authIntent.id },
      orderBy: { createdAt: 'desc' }
    });
    if (codes.length >= 10)
      throw new ServiceError(
        forbiddenError({
          message:
            'You have reached the maximum number of code requests. Please try again later.'
        })
      );

    let last = codes[0];
    if (last && Date.now() - last.createdAt.getTime() < 30 * 1000)
      throw new ServiceError(
        forbiddenError({
          message: 'Please wait a moment before requesting a new code.'
        })
      );

    await this.createAuthIntentCode({ step: i.step });
  }

  async verifyAuthIntentStep(i: {
    step: AuthIntentStep;
    input: { type: 'email_code'; code: string };
  }) {
    if (i.step.type != 'email_code' || i.input.type != 'email_code') {
      throw new ServiceError(forbiddenError({ message: 'Invalid step type' }));
    }

    let isCurrentStep =
      (await federationDB.authIntentStep.count({
        where: {
          authIntentId: i.step.authIntentId,
          index: { lt: i.step.index },
          verifiedAt: null
        }
      })) == 0;
    if (!isCurrentStep) {
      throw new ServiceError(
        forbiddenError({ message: 'Must complete previous steps first' })
      );
    }

    let code = await federationDB.authIntentCode.findFirst({
      where: {
        stepId: i.step.id,
        code: i.input.code
      }
    });
    let success = !!code;

    if (!success) {
      let verificationAttempts = await federationDB.authIntentVerificationAttempt.count({
        where: { authIntentId: i.step.authIntentId }
      });

      if (verificationAttempts > 15) {
        throw new ServiceError(
          forbiddenError({
            message: 'You have entered the wrong code too many times. Please try again later.'
          })
        );
      }
    }

    await federationDB.authIntentVerificationAttempt.create({
      data: {
        id: await FederationID.generateId('authIntentVerificationAttempt'),
        authIntentId: i.step.authIntentId,
        stepId: i.step.id,
        status: success ? 'success' : 'failure'
      }
    });

    if (success) {
      await federationDB.authIntentStep.update({
        where: { id: i.step.id },
        data: { verifiedAt: new Date() }
      });

      let unverifiedSteps = await federationDB.authIntentStep.count({
        where: {
          authIntentId: i.step.authIntentId,
          verifiedAt: null
        }
      });
      if (unverifiedSteps == 0) {
        await federationDB.authIntent.update({
          where: { id: i.step.authIntentId },
          data: { verifiedAt: new Date(), expiresAt: addMinutes(new Date(), 30) }
        });
      }
    } else {
      throw new ServiceError(
        badRequestError({
          message:
            'The code you entered is incorrect. Please enter the code from the email we sent you.'
        })
      );
    }
  }

  async verifyCaptcha(i: { token: string; authIntent: AuthIntent }) {
    if (!(await turnstileVerifier.verify({ token: i.token }))) {
      throw new ServiceError(forbiddenError({ message: 'Invalid captcha token' }));
    }

    await federationDB.authIntent.update({
      where: { id: i.authIntent.id },
      data: { captchaVerifiedAt: new Date() }
    });
  }

  async createUserForAuthIntent(i: {
    authIntent: AuthIntent;
    input: {
      firstName: string;
      lastName: string;
      acceptedTerms: boolean;
    };
  }) {
    if (!i.authIntent.verifiedAt || i.authIntent.userId) {
      throw new ServiceError(forbiddenError({ message: 'Invalid auth intent state' }));
    }

    if (!i.input.acceptedTerms) {
      throw new ServiceError(
        forbiddenError({
          message: 'You must accept the terms of service to continue'
        })
      );
    }

    let user = i.authIntent.identifier
      ? await userService.findByEmailSafe({
          email: i.authIntent.identifier
        })
      : null;

    return await withTransaction(async db => {
      if (user) {
        user = await userService.updateUser({
          user,
          input: {
            firstName: i.input.firstName,
            lastName: i.input.lastName
          },
          context: {
            ip: i.authIntent.ip,
            ua: i.authIntent.ua
          }
        });
      } else {
        user = await userService.createUser({
          email: i.authIntent.identifier!,
          firstName: i.input.firstName,
          lastName: i.input.lastName,
          acceptedTerms: i.input.acceptedTerms,
          type: 'standard_user',
          context: {
            ip: i.authIntent.ip,
            ua: i.authIntent.ua
          }
        });
      }

      await db.authIntent.update({
        where: { id: i.authIntent.id },
        data: { userId: user.id }
      });

      return user;
    });
  }

  async createAuthAttempt(i: {
    user: EnterpriseUser;
    device: AuthDevice;
    authIntent?: AuthIntent;
    redirectUrl: string;
    userImpersonation?: UserImpersonation;
  }) {
    return withTransaction(async db => {
      return await db.authAttempt.create({
        data: {
          id: await FederationID.generateId('authAttempt'),
          clientSecret: await FederationID.generateId('authAttemptClientSecret'),

          status: 'pending',

          userId: i.user.id,
          deviceId: i.device.id,

          redirectUrl: i.redirectUrl,
          authIntentId: i.authIntent?.id,
          userImpersonationId: i.userImpersonation?.id,

          ip: i.device.ip,
          ua: i.device.ua
        }
      });
    });
  }

  async completeAuthIntent(i: { authIntent: AuthIntent }) {
    if (
      !i.authIntent.captchaVerifiedAt ||
      !i.authIntent.verifiedAt ||
      !i.authIntent.userId ||
      i.authIntent.consumedAt
    ) {
      throw new ServiceError(forbiddenError({ message: 'Invalid auth intent state' }));
    }

    let [user, device] = await Promise.all([
      federationDB.enterpriseUser.findUnique({ where: { id: i.authIntent.userId } }),
      federationDB.authDevice.findUnique({ where: { id: i.authIntent.deviceId } })
    ]);
    if (!user || !device) throw new Error('WTF - Invalid auth intent state');

    if (Date.now() - user.createdAt.getTime() > 60 * 1000) {
      await successfulLoginVerification.send({
        data: {
          user,
          authIntent: i.authIntent
        },
        to: [user.email]
      });
    }

    return withTransaction(async db => {
      await db.authIntent.update({
        where: { id: i.authIntent.id },
        data: { consumedAt: new Date(), expiresAt: new Date() }
      });

      return await this.createAuthAttempt({
        authIntent: i.authIntent,
        redirectUrl: i.authIntent.redirectUrl,
        user,
        device
      });
    });
  }

  async getAuthAttempt(i: { authAttemptId: string; clientSecret: string }) {
    let authAttempt = await federationDB.authAttempt.findUnique({
      where: {
        id: i.authAttemptId,
        clientSecret: i.clientSecret,
        createdAt: { gt: subMinutes(new Date(), 1) }
      }
    });
    if (!authAttempt) throw new ServiceError(notFoundError('auth_attempt', i.authAttemptId));

    return authAttempt;
  }

  async dangerouslyGetAuthAttemptOnlyById(i: { authAttemptId: string }) {
    let authAttempt = await federationDB.authAttempt.findUnique({
      where: {
        id: i.authAttemptId,
        createdAt: { gt: subMinutes(new Date(), 1) }
      }
    });
    if (!authAttempt) throw new ServiceError(notFoundError('auth_attempt', i.authAttemptId));

    return authAttempt;
  }
}

export let authService = Service.create('AuthService', () => new AuthServiceImpl()).build();
