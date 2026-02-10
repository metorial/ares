import {
  badRequestError,
  forbiddenError,
  notFoundError,
  ServiceError
} from '@lowerdeck/error';
import { generateCode } from '@lowerdeck/id';
import { Service } from '@lowerdeck/service';
import { addMinutes, subMinutes } from 'date-fns';
import type {
  App,
  AuthDevice,
  AuthIntent,
  AuthIntentStep,
  User,
  UserImpersonation
} from '../../prisma/generated/client';
import { db, withTransaction } from '../db';
import { sendAuthCodeEmail } from '../email/authCode';
import { successfulLoginVerification } from '../email/successfulLogin';
import { getId } from '../id';
import type { Context } from '../lib/context';
import { parseEmail } from '../lib/parseEmail';
import type { OAuthCredentials } from '../lib/socials';
import { socials } from '../lib/socials';
import { turnstileVerifier } from '../lib/turnstile';
import { auditLogService } from './auditLog';
import { authBlockService } from './authBlock';
import { deviceService } from './device';
import { userService } from './user';

class AuthServiceImpl {
  async getAuthOptions(d: { app: App }) {
    let options: { type: string; name?: string }[] = [{ type: 'email' }];

    // Query database for enabled OAuth providers for this app
    let oauthProviders = await db.appOAuthProvider.findMany({
      where: {
        appOid: d.app.oid,
        enabled: true
      }
    });

    for (let provider of oauthProviders) {
      options.push({ type: `oauth.${provider.provider}` });
    }

    // Query SSO tenants with completed status for this app
    let ssoTenants = await db.ssoTenant.findMany({
      where: {
        appOid: d.app.oid,
        status: 'completed'
      }
    });

    for (let tenant of ssoTenants) {
      options.push({ type: `sso.${tenant.id}`, name: tenant.name });
    }

    return {
      options
    };
  }

  async authWithEmail(d: {
    email: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
    captchaToken?: string;
    app: App;
  }) {
    if (d.captchaToken && !(await turnstileVerifier.verify({ token: d.captchaToken }))) {
      throw new ServiceError(forbiddenError({ message: 'Invalid captcha token' }));
    }

    let email = parseEmail(d.email).email;

    await authBlockService.registerBlock({ email, context: d.context });

    auditLogService.log({
      appOid: d.app.oid,
      type: 'login.email',
      ip: d.context.ip,
      ua: d.context.ua,
      metadata: { email }
    });

    return await withTransaction(async tdb => {
      let user = await userService.findByEmailSafe({ email, app: d.app });

      if (user) {
        let isLoggedIn = await deviceService.checkIfUserIsLoggedIn({
          user,
          device: d.device
        });

        if (isLoggedIn) {
          return {
            type: 'auth_attempt' as const,
            authAttempt: await this.createAuthAttempt({
              user,
              device: d.device,
              redirectUrl: d.redirectUrl
            })
          };
        }
      }

      let authIntent = await tdb.authIntent.create({
        data: {
          ...getId('authIntent'),
          clientSecret: getId('authIntent').id,

          type: 'email_code',

          redirectUrl: d.redirectUrl,

          identifier: email,
          identifierType: 'email',

          userOid: user?.oid ?? null,
          deviceOid: d.device.oid,
          appOid: d.app.oid,

          expiresAt: addMinutes(new Date(), 30),

          ip: d.context.ip,
          ua: d.context.ua
        }
      });

      await this.createAuthIntentStep({
        type: 'email_code',
        email,
        authIntent,
        index: 0
      });

      return {
        type: 'auth_intent' as const,
        authIntent
      };
    });
  }

  async authWithImpersonationToken(d: {
    impersonationClientSecret: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
  }) {
    let userImpersonation = await db.userImpersonation.findUnique({
      where: { clientSecret: d.impersonationClientSecret },
      include: { user: true }
    });
    if (!userImpersonation || !d.impersonationClientSecret) {
      throw new ServiceError(
        badRequestError({
          message: 'Invalid impersonation token'
        })
      );
    }

    return await withTransaction(async tdb => {
      return await this.createAuthAttempt({
        user: userImpersonation.user,
        device: d.device,
        redirectUrl: d.redirectUrl,
        userImpersonation
      });
    });
  }

  async getSocialProviderAuthUrl(d: {
    provider: 'github' | 'google';
    state: string;
    app: App;
  }) {
    let oauthProvider = await db.appOAuthProvider.findFirst({
      where: {
        appOid: d.app.oid,
        provider: d.provider,
        enabled: true
      }
    });

    if (!oauthProvider) {
      throw new ServiceError(
        badRequestError({ message: `${d.provider} OAuth is not configured for this app` })
      );
    }

    let credentials: OAuthCredentials = {
      clientId: oauthProvider.clientId,
      clientSecret: oauthProvider.clientSecret,
      redirectUri: oauthProvider.redirectUri
    };

    return socials[d.provider].getAuthUrl(d.state, credentials);
  }

  async authWithSocialProviderToken(d: {
    code: string;
    provider: 'github' | 'google';
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
    app: App;
  }) {
    let oauthProvider = await db.appOAuthProvider.findFirst({
      where: {
        appOid: d.app.oid,
        provider: d.provider,
        enabled: true
      }
    });

    if (!oauthProvider) {
      throw new ServiceError(
        badRequestError({ message: `${d.provider} OAuth is not configured for this app` })
      );
    }

    let credentials: OAuthCredentials = {
      clientId: oauthProvider.clientId,
      clientSecret: oauthProvider.clientSecret,
      redirectUri: oauthProvider.redirectUri
    };

    let socialRes = await socials[d.provider].exchangeCodeForData(d.code, credentials);

    auditLogService.log({
      appOid: d.app.oid,
      type: 'login.oauth',
      ip: d.context.ip,
      ua: d.context.ua,
      metadata: { provider: d.provider }
    });

    if (!socialRes.email) {
      throw new ServiceError(
        badRequestError({ message: 'Social provider did not return email address' })
      );
    }

    // Get or create user identity provider
    let identityProvider = await db.userIdentityProvider.findFirst({
      where: { identifier: d.provider }
    });
    if (!identityProvider) {
      identityProvider = await db.userIdentityProvider.create({
        data: {
          ...getId('userIdentityProvider'),
          identifier: d.provider,
          name: d.provider.charAt(0).toUpperCase() + d.provider.slice(1)
        }
      });
    }

    let userIdentity = await db.userIdentity.findFirst({
      where: {
        providerOid: identityProvider.oid,
        uid: socialRes.id
      }
    });

    if (!userIdentity) {
      let name = socialRes.name || socialRes.email.split('@')[0]!;
      let nameParts = name.split(' ');
      let firstName = nameParts[0]!;
      let lastName = nameParts.slice(1).join(' ');

      userIdentity = await db.userIdentity.create({
        data: {
          ...getId('userIdentity'),
          uid: socialRes.id,
          email: socialRes.email,
          firstName,
          lastName,
          name,
          photoUrl: socialRes.photoUrl ?? null,
          providerOid: identityProvider.oid,
          userOid: null
        }
      });
    }

    if (!userIdentity.userOid) {
      let user = await userService.findByEmailSafe({
        email: socialRes.email,
        app: d.app
      });

      if (user) {
        userIdentity = await db.userIdentity.update({
          where: { oid: userIdentity.oid },
          data: { userOid: user.oid }
        });
      }
    }

    let user = userIdentity.userOid
      ? await db.user.findUnique({ where: { oid: userIdentity.userOid } })
      : null;

    if (
      user &&
      (await deviceService.checkIfUserIsLoggedIn({
        user,
        device: d.device
      }))
    ) {
      return {
        type: 'auth_attempt' as const,
        authAttempt: await this.createAuthAttempt({
          user,
          device: d.device,
          redirectUrl: d.redirectUrl
        })
      };
    }

    let authIntent = await db.authIntent.create({
      data: {
        ...getId('authIntent'),
        clientSecret: getId('authIntent').id,

        type: 'oauth',
        userIdentityOid: userIdentity.oid,
        userOid: userIdentity.userOid,
        deviceOid: d.device.oid,
        appOid: d.app.oid,

        redirectUrl: d.redirectUrl,

        identifier: socialRes.email,
        identifierType: 'email',

        ip: d.context.ip,
        ua: d.context.ua,

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

  async authWithSso(d: {
    ssoUser: { email: string; firstName: string; lastName: string };
    ssoConnectionId: string;
    ssoUid: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
    app: App;
  }) {
    let providerIdentifier = `sso.${d.ssoConnectionId}`;

    // Get or create user identity provider
    let identityProvider = await db.userIdentityProvider.findFirst({
      where: { identifier: providerIdentifier }
    });
    if (!identityProvider) {
      identityProvider = await db.userIdentityProvider.create({
        data: {
          ...getId('userIdentityProvider'),
          identifier: providerIdentifier,
          name: `SSO ${d.ssoConnectionId}`
        }
      });
    }

    // Find or create user identity
    let userIdentity = await db.userIdentity.findFirst({
      where: {
        providerOid: identityProvider.oid,
        uid: d.ssoUid
      }
    });

    if (userIdentity) {
      // Update existing identity with latest profile data
      userIdentity = await db.userIdentity.update({
        where: { oid: userIdentity.oid },
        data: {
          email: d.ssoUser.email,
          firstName: d.ssoUser.firstName,
          lastName: d.ssoUser.lastName,
          name: `${d.ssoUser.firstName} ${d.ssoUser.lastName}`.trim()
        }
      });
    } else {
      userIdentity = await db.userIdentity.create({
        data: {
          ...getId('userIdentity'),
          uid: d.ssoUid,
          email: d.ssoUser.email,
          firstName: d.ssoUser.firstName,
          lastName: d.ssoUser.lastName,
          name: `${d.ssoUser.firstName} ${d.ssoUser.lastName}`.trim(),
          photoUrl: null,
          providerOid: identityProvider.oid,
          userOid: null
        }
      });
    }

    // Link identity to user if not already linked
    if (!userIdentity.userOid) {
      let user = await userService.findByEmailSafe({
        email: d.ssoUser.email,
        app: d.app
      });

      if (!user) {
        user = await userService.createUser({
          email: d.ssoUser.email,
          firstName: d.ssoUser.firstName,
          lastName: d.ssoUser.lastName,
          acceptedTerms: true,
          type: 'standard_user',
          context: d.context,
          app: d.app
        });
      }

      userIdentity = await db.userIdentity.update({
        where: { oid: userIdentity.oid },
        data: { userOid: user.oid }
      });
    }

    let user = await db.user.findUnique({ where: { oid: userIdentity.userOid! } });
    if (!user) throw new Error('User not found after SSO identity linking');

    auditLogService.log({
      appOid: d.app.oid,
      type: 'login.sso',
      userOid: user.oid,
      ip: d.context.ip,
      ua: d.context.ua,
      metadata: { ssoConnectionId: d.ssoConnectionId }
    });

    return await this.createAuthAttempt({
      user,
      device: d.device,
      redirectUrl: d.redirectUrl
    });
  }

  async createAuthIntentStep(
    i: { type: 'email_code'; email: string } & { authIntent: AuthIntent; index: number }
  ) {
    return await withTransaction(async tdb => {
      let step = await tdb.authIntentStep.create({
        data: {
          ...getId('authIntentStep'),
          authIntentOid: i.authIntent.oid,
          type: i.type,
          index: i.index,
          email: i.email
        }
      });

      await this.createAuthIntentCode({ step });
    });
  }

  async createAuthIntentCode(d: { step: AuthIntentStep }) {
    if (!d.step.email) throw new Error('Invalid step for code sending');

    await withTransaction(async tdb => {
      let code = await tdb.authIntentCode.create({
        data: {
          ...getId('authIntentCode'),
          authIntentOid: d.step.authIntentOid,
          stepOid: d.step.oid,
          email: d.step.email!,
          code: process.env.NODE_ENV == 'development' ? '111111' : generateCode(6)
        }
      });

      await sendAuthCodeEmail.send({
        to: [d.step.email!],
        data: { code: code.code }
      });

      return code;
    });
  }

  async getAuthIntent(d: { authIntentId: string; clientSecret: string }) {
    let authIntent = await db.authIntent.findUnique({
      where: {
        id: d.authIntentId,
        clientSecret: d.clientSecret,
        expiresAt: { gt: new Date() },
        consumedAt: null
      },
      include: {
        steps: { include: { codes: true } },
        userIdentity: true
      }
    });
    if (!authIntent) throw new ServiceError(notFoundError('auth_intent', d.authIntentId));

    return authIntent;
  }

  async resendAuthIntentCode(d: { authIntent: AuthIntent; step: AuthIntentStep }) {
    let codes = await db.authIntentCode.findMany({
      where: { authIntentOid: d.authIntent.oid },
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

    await this.createAuthIntentCode({ step: d.step });
  }

  async verifyAuthIntentStep(d: {
    step: AuthIntentStep;
    input: { type: 'email_code'; code: string };
  }) {
    if (d.step.type != 'email_code' || d.input.type != 'email_code') {
      throw new ServiceError(forbiddenError({ message: 'Invalid step type' }));
    }

    let isCurrentStep =
      (await db.authIntentStep.count({
        where: {
          authIntentOid: d.step.authIntentOid,
          index: { lt: d.step.index },
          verifiedAt: null
        }
      })) == 0;
    if (!isCurrentStep) {
      throw new ServiceError(
        forbiddenError({ message: 'Must complete previous steps first' })
      );
    }

    let code = await db.authIntentCode.findFirst({
      where: {
        stepOid: d.step.oid,
        code: d.input.code
      }
    });
    let success = !!code;

    if (!success) {
      let verificationAttempts = await db.authIntentVerificationAttempt.count({
        where: { authIntentOid: d.step.authIntentOid }
      });

      if (verificationAttempts > 15) {
        throw new ServiceError(
          forbiddenError({
            message: 'You have entered the wrong code too many times. Please try again later.'
          })
        );
      }
    }

    await db.authIntentVerificationAttempt.create({
      data: {
        ...getId('authIntentVerificationAttempt'),
        authIntentOid: d.step.authIntentOid,
        stepId: d.step.id,
        status: success ? 'success' : 'failure'
      }
    });

    if (success) {
      await db.authIntentStep.update({
        where: { oid: d.step.oid },
        data: { verifiedAt: new Date() }
      });

      let unverifiedSteps = await db.authIntentStep.count({
        where: {
          authIntentOid: d.step.authIntentOid,
          verifiedAt: null
        }
      });
      if (unverifiedSteps == 0) {
        await db.authIntent.update({
          where: { oid: d.step.authIntentOid },
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

  async verifyCaptcha(d: { token: string; authIntent: AuthIntent }) {
    if (!(await turnstileVerifier.verify({ token: d.token }))) {
      throw new ServiceError(forbiddenError({ message: 'Invalid captcha token' }));
    }

    await db.authIntent.update({
      where: { oid: d.authIntent.oid },
      data: { captchaVerifiedAt: new Date() }
    });
  }

  async createUserForAuthIntent(d: {
    authIntent: AuthIntent;
    input: {
      firstName: string;
      lastName: string;
      acceptedTerms: boolean;
    };
    app: App;
  }) {
    if (!d.authIntent.verifiedAt || d.authIntent.userOid) {
      throw new ServiceError(forbiddenError({ message: 'Invalid auth intent state' }));
    }

    if (!d.input.acceptedTerms) {
      throw new ServiceError(
        forbiddenError({
          message: 'You must accept the terms of service to continue'
        })
      );
    }

    let user = d.authIntent.identifier
      ? await userService.findByEmailSafe({
          email: d.authIntent.identifier,
          app: d.app
        })
      : null;

    return await withTransaction(async tdb => {
      if (user) {
        user = await userService.updateUser({
          user,
          input: {
            firstName: d.input.firstName,
            lastName: d.input.lastName
          },
          context: {
            ip: d.authIntent.ip,
            ua: d.authIntent.ua ?? ''
          }
        });
      } else {
        if (!d.authIntent.identifier) {
          throw new ServiceError(
            badRequestError({
              message: 'Cannot create user without email identifier'
            })
          );
        }

        user = await userService.createUser({
          email: d.authIntent.identifier,
          firstName: d.input.firstName,
          lastName: d.input.lastName,
          acceptedTerms: d.input.acceptedTerms,
          type: 'standard_user',
          context: {
            ip: d.authIntent.ip,
            ua: d.authIntent.ua ?? ''
          },
          app: d.app
        });
      }

      await tdb.authIntent.update({
        where: { oid: d.authIntent.oid },
        data: { userOid: user.oid }
      });

      return user;
    });
  }

  async createAuthAttempt(d: {
    user: User;
    device: AuthDevice;
    authIntent?: AuthIntent;
    redirectUrl: string;
    userImpersonation?: UserImpersonation;
  }) {
    return withTransaction(async tdb => {
      return await tdb.authAttempt.create({
        data: {
          ...getId('authAttempt'),
          clientSecret: getId('authAttempt').id,

          status: 'pending',

          userOid: d.user.oid,
          deviceOid: d.device.oid,
          appOid: d.user.appOid,

          redirectUrl: d.redirectUrl,
          authIntentOid: d.authIntent?.oid ?? null,
          userImpersonationId: d.userImpersonation?.id ?? null,

          ip: d.device.ip,
          ua: d.device.ua ?? ''
        }
      });
    });
  }

  async completeAuthIntent(d: { authIntent: AuthIntent; app: App }) {
    if (
      !d.authIntent.captchaVerifiedAt ||
      !d.authIntent.verifiedAt ||
      !d.authIntent.userOid ||
      d.authIntent.consumedAt
    ) {
      throw new ServiceError(forbiddenError({ message: 'Invalid auth intent state' }));
    }

    let [user, device] = await Promise.all([
      db.user.findUnique({ where: { oid: d.authIntent.userOid } }),
      db.authDevice.findUnique({ where: { oid: d.authIntent.deviceOid } })
    ]);
    if (!user || !device) throw new Error('WTF - Invalid auth intent state');

    if (Date.now() - user.createdAt.getTime() > 60 * 1000) {
      await successfulLoginVerification.send({
        data: {
          user,
          authIntent: d.authIntent
        },
        to: [user.email]
      });
    }

    return withTransaction(async tdb => {
      await tdb.authIntent.update({
        where: { oid: d.authIntent.oid },
        data: { consumedAt: new Date(), expiresAt: new Date() }
      });

      return await this.createAuthAttempt({
        authIntent: d.authIntent,
        redirectUrl: d.authIntent.redirectUrl,
        user,
        device
      });
    });
  }

  async getAuthAttempt(d: { authAttemptId: string; clientSecret: string }) {
    let authAttempt = await db.authAttempt.findUnique({
      where: {
        id: d.authAttemptId,
        clientSecret: d.clientSecret,
        createdAt: { gt: subMinutes(new Date(), 1) }
      }
    });
    if (!authAttempt) throw new ServiceError(notFoundError('auth_attempt', d.authAttemptId));

    return authAttempt;
  }

  async dangerouslyGetAuthAttemptOnlyById(d: { authAttemptId: string }) {
    let authAttempt = await db.authAttempt.findUnique({
      where: {
        id: d.authAttemptId,
        createdAt: { gt: subMinutes(new Date(), 1) }
      }
    });
    if (!authAttempt) throw new ServiceError(notFoundError('auth_attempt', d.authAttemptId));

    return authAttempt;
  }
}

export let authService = Service.create('AuthService', () => new AuthServiceImpl()).build();
