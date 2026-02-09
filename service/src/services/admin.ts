import { Admin, federationDB, FederationID } from '@metorial-enterprise/federation-data';
import { Context } from '@metorial/context';
import {
  badRequestError,
  notFoundError,
  ServiceError,
  unauthorizedError
} from '@metorial/error';
import { generatePlainId } from '@metorial/id';
import { Service } from '@metorial/service';
import { addHours } from 'date-fns';
import { adminAuthConfig, authConfig } from '../definitions';
import { earlyAccessRepository } from '../earlyAccess';
import { sendInviteEmail } from '../email/invite';
import { env } from '../env';
import { sso } from '../lib/sso';
import { authBlockService } from './authBlock';

class IdAdminServiceImpl {
  async adminLogin(i: {
    email: string;
    context: Context;
    credentials?:
      | { type: 'password'; password: string }
      | { type: 'sso'; profile: { id: string; email: string; name: string } };
  }) {
    await authBlockService.registerBlock({ email: i.email, context: i.context });

    let admin = await federationDB.admin.findUnique({
      where: {
        email: i.email
      }
    });

    let err = new ServiceError(
      unauthorizedError({
        message: 'Invalid email or password'
      })
    );

    // Skip password check in development for easier testing
    if (process.env.NODE_ENV != 'development') {
      if (i.credentials?.type === 'password') {
        if (!admin) throw err;

        let valid = await Bun.password.verify(i.credentials.password, admin.password);
        if (!valid) throw err;
      } else if (i.credentials?.type === 'sso') {
        if (!admin) {
          // Auto-provision admin if not exists
          admin = await federationDB.admin.create({
            data: {
              id: FederationID.generateIdSync('admin'),
              email: i.credentials.profile.email,
              name: i.credentials.profile.name,
              password: '' // No password for SSO users
            }
          });
        }
      } else {
        throw err;
      }
    } else if (!admin) throw err;

    return await federationDB.adminSession.create({
      data: {
        id: FederationID.generateIdSync('adminSession'),
        clientSecret: generatePlainId(50),
        adminId: admin.id,
        expiresAt: addHours(new Date(), 1),
        ip: i.context.ip,
        ua: i.context.ua
      }
    });
  }

  async getSsoSetupUrl(i: { redirectUri: string; tenantName: string }) {
    let tenant = await sso.tenant.createTenant({
      name: i.tenantName,
      externalId: generatePlainId(20),
      metadata: {}
    });

    let setup = await sso.tenant.createSetup({
      tenantId: tenant.id,
      redirectUri: i.redirectUri
    });

    return setup.url;
  }

  async getAdminAuthBoot() {
    let config = await adminAuthConfig();

    if (env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_CLIENT_ID) {
      return {
        method: 'google' as const
      };
    }

    if (config.ssoTenantId) {
      return {
        method: 'sso' as const,
        tenantId: config.ssoTenantId
      };
    }

    return {
      method: 'password' as const
    };
  }

  async setSsoTenantForAdminAuth(i: { tenantId: string }) {
    let current = await adminAuthConfig();

    let tenant = await sso.tenant.getTenant({ tenantId: i.tenantId });

    await federationDB.adminAuthConfig.update({
      where: { id: current.id },
      data: {
        ssoTenantId: tenant.id
      }
    });

    await federationDB.adminSession.deleteMany({});
  }

  async setSsoTenantForAuth(i: { tenantId: string }) {
    let current = await authConfig();

    let tenant = await sso.tenant.getTenant({ tenantId: i.tenantId });

    await federationDB.authConfig.update({
      where: { id: current.id },
      data: {
        ssoTenantId: tenant.id
      }
    });
  }

  async adminGoogleLoginStart(i: { context: Context; state: string }) {
    if (!env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_REDIRECT_URI) {
      throw new ServiceError(badRequestError({ message: 'Google OAuth is not configured' }));
    }

    let url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_CLIENT_ID!);
    url.searchParams.set(
      'redirect_uri',
      env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_REDIRECT_URI!
    );
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', i.state);

    return {
      url: url.toString()
    };
  }

  async adminGoogleLoginFinish(i: { code: string; context: Context; state: string }) {
    if (!env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_REDIRECT_URI) {
      throw new ServiceError(badRequestError({ message: 'Google OAuth is not configured' }));
    }

    let tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: i.code,
        client_id: env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_CLIENT_ID!,
        client_secret: env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.metorialGoogle.METORIAL_INTERNAL_GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
        state: i.state
      })
    });

    if (!tokenRes.ok) {
      throw new ServiceError(
        badRequestError({ message: 'Failed to exchange code for access token' })
      );
    }

    let tokenData: { access_token: string } = await tokenRes.json();

    let profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!profileRes.ok) {
      throw new ServiceError(badRequestError({ message: 'Failed to fetch user profile' }));
    }

    let profileData: {
      email: string;
      verified_email: boolean;
      name: string;
      given_name: string;
      family_name: string;
      picture: string;
      locale: string;
    } = await profileRes.json();
    if (!profileData.verified_email) {
      throw new ServiceError(
        badRequestError({ message: 'Google account email is not verified' })
      );
    }
    if (!profileData.email.endsWith('@metorial.com')) {
      throw new ServiceError(badRequestError({ message: 'Google account is not allowed' }));
    }

    return await this.adminLogin({
      email: profileData.email,
      context: i.context,
      credentials: {
        type: 'sso',
        profile: {
          id: profileData.email,
          email: profileData.email,
          name: profileData.name ?? profileData.email.split('@')[0]
        }
      }
    });
  }

  async adminSsoLoginStart(i: { context: Context; state: string; redirectUri: string }) {
    let current = await adminAuthConfig();
    if (!current.ssoTenantId) {
      throw new ServiceError(badRequestError({ message: 'SSO is not configured' }));
    }

    let auth = await sso.auth.start({
      tenantId: current.ssoTenantId,
      redirectUri: i.redirectUri,
      state: i.state
    });

    return {
      url: auth.url
    };
  }

  async adminSsoLoginFinish(i: { context: Context; authId: string }) {
    let current = await adminAuthConfig();
    if (!current.ssoTenantId) {
      throw new ServiceError(badRequestError({ message: 'SSO is not configured' }));
    }

    let { profile, auth } = await sso.auth.complete({
      authId: i.authId
    });

    let session = await this.adminLogin({
      email: profile.email,
      context: i.context,
      credentials: {
        type: 'sso',
        profile: {
          id: profile.id,
          email: profile.email,
          name:
            [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
            profile.email.split('@')[0]
        }
      }
    });

    return {
      session,
      auth
    };
  }

  async listUsers(i: { after?: string; search?: string }) {
    return await federationDB.enterpriseUser.findMany({
      where: {
        OR: i.search
          ? [
              { emails: { some: { email: { contains: i.search } } } },
              { name: { contains: i.search } },
              { firstName: { contains: i.search } },
              { lastName: { contains: i.search } }
            ]
          : undefined,

        id: i.after ? { gt: i.after } : undefined
      },
      take: 100,
      orderBy: { id: 'asc' }
    });
  }

  async getUser(i: { id: string }) {
    let user = await federationDB.enterpriseUser.findUnique({
      where: { id: i.id },
      include: {
        emails: true,
        sessions: {
          include: {
            device: true
          }
        },
        termsAgreements: true,
        actions: true,
        organizations: {
          include: {
            organization: true
          }
        },
        authAttempts: true
      }
    });
    if (!user) {
      throw new ServiceError(notFoundError('user', i.id));
    }

    return user;
  }

  async impersonateUser(i: { id: string; password?: string; admin: Admin; reason: string }) {
    let user = await this.getUser({ id: i.id });

    // BE VERY CAREFUL WITH THIS
    if (process.env.NODE_ENV != 'development') {
      if (i.admin.password.length) {
        if (!i.password) {
          throw new ServiceError(badRequestError({ message: 'Password is required' }));
        }

        let valid = await Bun.password.verify(i.password!, i.admin.password);
        if (!valid) {
          throw new ServiceError(badRequestError({ message: 'Invalid password' }));
        }
      }
    }

    return await federationDB.userImpersonation.create({
      data: {
        id: FederationID.generateIdSync('userImpersonation'),
        clientSecret: generatePlainId(50),
        userId: user.id,
        adminId: i.admin.id,
        reason: i.reason,
        expiresAt: addHours(new Date(), 1)
      }
    });
  }

  async listOrganizations(i: { after?: string; search?: string }) {
    return await federationDB.enterpriseOrganization.findMany({
      where: {
        OR: i.search
          ? [{ name: { contains: i.search } }, { slug: { contains: i.search } }]
          : undefined,

        id: i.after ? { gt: i.after } : undefined
      },
      take: 100,
      orderBy: { id: 'asc' }
    });
  }

  async getOrganization(i: { id: string }) {
    let org = await federationDB.enterpriseOrganization.findUnique({
      where: { id: i.id },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });
    if (!org) {
      throw new ServiceError(notFoundError('organization', i.id));
    }

    return org;
  }

  async listAdmins(i: { after?: string; search?: string }) {
    return await federationDB.admin.findMany({
      where: {
        OR: i.search
          ? [{ name: { contains: i.search } }, { email: { contains: i.search } }]
          : undefined,

        id: i.after ? { gt: i.after } : undefined
      },
      take: 25,
      orderBy: { id: 'asc' }
    });
  }

  async updateAuthConfig(i: { hasWhitelist: boolean }) {
    let current = await authConfig();

    let res = await federationDB.authConfig.update({
      where: { id: current.id },
      data: {
        hasWhitelist: i.hasWhitelist
      }
    });

    Object.assign(current, res);

    return current;
  }

  async getAuthConfig() {
    return await authConfig;
  }

  async authenticateAdmin(i: { clientSecret: string }) {
    let session = await federationDB.adminSession.findUnique({
      where: { clientSecret: i.clientSecret },
      include: {
        admin: true
      }
    });
    if (!session || session.expiresAt < new Date()) {
      throw new ServiceError(unauthorizedError({ message: 'Invalid session' }));
    }

    return session.admin;
  }

  async createInvite(i: { email: string; title?: string; message?: string }) {
    let existingInvite = await federationDB.userInvite.findFirst({
      where: { email: i.email }
    });
    if (existingInvite) {
      return existingInvite;
    }

    let invite = await federationDB.userInvite.create({
      data: {
        id: FederationID.generateIdSync('userInvite'),
        status: 'pending',
        email: i.email
      }
    });

    await sendInviteEmail.send({
      data: { email: i.email, title: i.title, message: i.message },
      to: [i.email]
    });

    return invite;
  }

  async listInvites(i: { after?: string; search?: string }) {
    return await federationDB.userInvite.findMany({
      where: {
        id: i.after ? { gt: i.after } : undefined,
        email: i.search ? { contains: i.search } : undefined
      },
      take: 25,
      orderBy: { id: 'asc' }
    });
  }

  async listFlags(i: { after?: string }) {
    return await federationDB.flag.findMany({
      where: {
        id: i.after ? { gt: i.after } : undefined
      },
      take: 500,
      orderBy: { id: 'asc' }
    });
  }

  async setOrganizationFlag(i: { organizationId: string; flagId: string; value: any }) {
    await federationDB.organizationFlagOverride.upsert({
      where: {
        organizationId_flagId: {
          organizationId: i.organizationId,
          flagId: i.flagId
        }
      },
      update: {
        value: i.value
      },
      create: {
        organizationId: i.organizationId,
        flagId: i.flagId,
        value: i.value
      }
    });
  }

  async listEarlyAccessRegistrations(i: { after?: string; search?: string }) {
    return earlyAccessRepository.listRegistrations(i);
  }
}

export let idAdminService = Service.create(
  'IdAdminService',
  () => new IdAdminServiceImpl()
).build();
