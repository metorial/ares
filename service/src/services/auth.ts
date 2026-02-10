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
import { authBlockService } from './authBlock';
import { deviceService } from './device';
import { userService } from './user';

class AuthServiceImpl {
  async getAuthOptions(i: { app: App }) {
    let options: { type: string }[] = [{ type: 'email' }];

    // Query database for enabled OAuth providers for this app
    let oauthProviders = await db.appOAuthProvider.findMany({
      where: {
        appOid: i.app.oid,
        enabled: true
      }
    });

    for (let provider of oauthProviders) {
      options.push({ type: `oauth.${provider.provider}` });
    }

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
    app: App;
  }) {
    if (i.captchaToken && !(await turnstileVerifier.verify({ token: i.captchaToken }))) {
      throw new ServiceError(forbiddenError({ message: 'Invalid captcha token' }));
    }

    let email = parseEmail(i.email).email;

    await authBlockService.registerBlock({ email, context: i.context });

    return await withTransaction(async tdb => {
      let user = await userService.findByEmailSafe({ email, app: i.app });

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

      let authIntent = await tdb.authIntent.create({
        data: {
          ...getId('authIntent'),
          clientSecret: getId('authIntent').id,

          type: 'email_code',

          redirectUrl: i.redirectUrl,

          identifier: email,
          identifierType: 'email',

          userOid: user?.oid ?? null,
          deviceOid: i.device.oid,
          appOid: i.app.oid,

          expiresAt: addMinutes(new Date(), 30),

          ip: i.context.ip,
          ua: i.context.ua
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

  async authWithImpersonationToken(i: {
    impersonationClientSecret: string;
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
  }) {
    let userImpersonation = await db.userImpersonation.findUnique({
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

    return await withTransaction(async tdb => {
      return await this.createAuthAttempt({
        user: userImpersonation.user,
        device: i.device,
        redirectUrl: i.redirectUrl,
        userImpersonation
      });
    });
  }

  async getSocialProviderAuthUrl(i: {
    provider: 'github' | 'google';
    state: string;
    app: App;
  }) {
    let oauthProvider = await db.appOAuthProvider.findFirst({
      where: {
        appOid: i.app.oid,
        provider: i.provider,
        enabled: true
      }
    });

    if (!oauthProvider) {
      throw new ServiceError(
        badRequestError({ message: `${i.provider} OAuth is not configured for this app` })
      );
    }

    let credentials: OAuthCredentials = {
      clientId: oauthProvider.clientId,
      clientSecret: oauthProvider.clientSecret,
      redirectUri: oauthProvider.redirectUri
    };

    return socials[i.provider].getAuthUrl(i.state, credentials);
  }

  async authWithSocialProviderToken(i: {
    code: string;
    provider: 'github' | 'google';
    context: Context;
    redirectUrl: string;
    device: AuthDevice;
    app: App;
  }) {
    let oauthProvider = await db.appOAuthProvider.findFirst({
      where: {
        appOid: i.app.oid,
        provider: i.provider,
        enabled: true
      }
    });

    if (!oauthProvider) {
      throw new ServiceError(
        badRequestError({ message: `${i.provider} OAuth is not configured for this app` })
      );
    }

    let credentials: OAuthCredentials = {
      clientId: oauthProvider.clientId,
      clientSecret: oauthProvider.clientSecret,
      redirectUri: oauthProvider.redirectUri
    };

    let socialRes = await socials[i.provider].exchangeCodeForData(i.code, credentials);

    if (!socialRes.email) {
      throw new ServiceError(
        badRequestError({ message: 'Social provider did not return email address' })
      );
    }

    // Get or create user identity provider
    let identityProvider = await db.userIdentityProvider.findFirst({
      where: { identifier: i.provider }
    });
    if (!identityProvider) {
      identityProvider = await db.userIdentityProvider.create({
        data: {
          ...getId('userIdentityProvider'),
          identifier: i.provider,
          name: i.provider.charAt(0).toUpperCase() + i.provider.slice(1)
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
        app: i.app
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

    let authIntent = await db.authIntent.create({
      data: {
        ...getId('authIntent'),
        clientSecret: getId('authIntent').id,

        type: 'oauth',
        userIdentityOid: userIdentity.oid,
        userOid: userIdentity.userOid,
        deviceOid: i.device.oid,
        appOid: i.app.oid,

        redirectUrl: i.redirectUrl,

        identifier: socialRes.email,
        identifierType: 'email',

        ip: i.context.ip,
        ua: i.context.ua,

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

  async createAuthIntentCode(i: { step: AuthIntentStep }) {
    if (!i.step.email) throw new Error('Invalid step for code sending');

    await withTransaction(async tdb => {
      let code = await tdb.authIntentCode.create({
        data: {
          ...getId('authIntentCode'),
          authIntentOid: i.step.authIntentOid,
          stepOid: i.step.oid,
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
    let authIntent = await db.authIntent.findUnique({
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
    let codes = await db.authIntentCode.findMany({
      where: { authIntentOid: i.authIntent.oid },
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
      (await db.authIntentStep.count({
        where: {
          authIntentOid: i.step.authIntentOid,
          index: { lt: i.step.index },
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
        stepOid: i.step.oid,
        code: i.input.code
      }
    });
    let success = !!code;

    if (!success) {
      let verificationAttempts = await db.authIntentVerificationAttempt.count({
        where: { authIntentOid: i.step.authIntentOid }
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
        authIntentOid: i.step.authIntentOid,
        stepId: i.step.id,
        status: success ? 'success' : 'failure'
      }
    });

    if (success) {
      await db.authIntentStep.update({
        where: { oid: i.step.oid },
        data: { verifiedAt: new Date() }
      });

      let unverifiedSteps = await db.authIntentStep.count({
        where: {
          authIntentOid: i.step.authIntentOid,
          verifiedAt: null
        }
      });
      if (unverifiedSteps == 0) {
        await db.authIntent.update({
          where: { oid: i.step.authIntentOid },
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

    await db.authIntent.update({
      where: { oid: i.authIntent.oid },
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
    app: App;
  }) {
    if (!i.authIntent.verifiedAt || i.authIntent.userOid) {
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
          email: i.authIntent.identifier,
          app: i.app
        })
      : null;

    return await withTransaction(async tdb => {
      if (user) {
        user = await userService.updateUser({
          user,
          input: {
            firstName: i.input.firstName,
            lastName: i.input.lastName
          },
          context: {
            ip: i.authIntent.ip,
            ua: i.authIntent.ua ?? ''
          }
        });
      } else {
        if (!i.authIntent.identifier) {
          throw new ServiceError(
            badRequestError({
              message: 'Cannot create user without email identifier'
            })
          );
        }

        user = await userService.createUser({
          email: i.authIntent.identifier,
          firstName: i.input.firstName,
          lastName: i.input.lastName,
          acceptedTerms: i.input.acceptedTerms,
          type: 'standard_user',
          context: {
            ip: i.authIntent.ip,
            ua: i.authIntent.ua ?? ''
          },
          app: i.app
        });
      }

      await tdb.authIntent.update({
        where: { oid: i.authIntent.oid },
        data: { userOid: user.oid }
      });

      return user;
    });
  }

  async createAuthAttempt(i: {
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

          userOid: i.user.oid,
          deviceOid: i.device.oid,
          appOid: i.user.appOid,

          redirectUrl: i.redirectUrl,
          authIntentOid: i.authIntent?.oid ?? null,
          userImpersonationId: i.userImpersonation?.id ?? null,

          ip: i.device.ip,
          ua: i.device.ua ?? ''
        }
      });
    });
  }

  async completeAuthIntent(i: { authIntent: AuthIntent; app: App }) {
    if (
      !i.authIntent.captchaVerifiedAt ||
      !i.authIntent.verifiedAt ||
      !i.authIntent.userOid ||
      i.authIntent.consumedAt
    ) {
      throw new ServiceError(forbiddenError({ message: 'Invalid auth intent state' }));
    }

    let [user, device] = await Promise.all([
      db.user.findUnique({ where: { oid: i.authIntent.userOid } }),
      db.authDevice.findUnique({ where: { oid: i.authIntent.deviceOid } })
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

    return withTransaction(async tdb => {
      await tdb.authIntent.update({
        where: { oid: i.authIntent.oid },
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
    let authAttempt = await db.authAttempt.findUnique({
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
    let authAttempt = await db.authAttempt.findUnique({
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
