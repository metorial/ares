import { badRequestError, notFoundError, ServiceError } from '@lowerdeck/error';
import { generatePlainId } from '@lowerdeck/id';
import type {
  App,
  SsoAuth,
  SsoConnection,
  SsoConnectionSetup,
  SsoTenant
} from '../../prisma/generated/client';
import { db } from '../db';
import { getId, ID } from '../id';
import { jackson } from '../lib/jackson';

class SsoServiceImpl {
  // ─── Tenant ───

  async createTenant(d: {
    app: App;
    input: {
      name: string;
      metadata?: Record<string, any>;
      externalId?: string;
    };
  }) {
    return await db.ssoTenant.create({
      data: {
        ...getId('ssoTenant'),
        clientId: await ID.generateId('ssoTenant_clientId'),
        appOid: d.app.oid,
        name: d.input.name,
        metadata: d.input.metadata ?? undefined,
        externalId: d.input.externalId ?? null
      }
    });
  }

  async updateTenant(d: {
    tenant: SsoTenant;
    input: {
      name?: string;
      metadata?: Record<string, any>;
      externalId?: string;
    };
  }) {
    return await db.ssoTenant.update({
      where: { oid: d.tenant.oid },
      data: {
        name: d.input.name ?? undefined,
        metadata: d.input.metadata ?? undefined,
        externalId: d.input.externalId ?? undefined
      }
    });
  }

  async getTenantById(d: { tenantId: string }) {
    let tenant = await db.ssoTenant.findUnique({ where: { id: d.tenantId } });
    if (!tenant) throw new ServiceError(notFoundError('sso.tenant'));
    return tenant;
  }

  async getTenantByClientId(d: { clientId: string }) {
    let tenant = await db.ssoTenant.findUnique({ where: { clientId: d.clientId } });
    if (!tenant) throw new ServiceError(notFoundError('sso.tenant'));
    return tenant;
  }

  // ─── Connection ───

  async createSamlConnection(d: {
    tenant: SsoTenant;
    input: {
      name: string;
      metadata?: Record<string, any>;
      provider: string;
      samlMetadata:
        | { type: 'xml'; payload: string }
        | { type: 'url'; url: string };
    };
  }) {
    let con = await jackson.apiController.createSAMLConnection({
      product: 'metorial',
      tenant: d.tenant.id,
      name: d.input.name,
      redirectUrl: jackson.redirectUrl,
      defaultRedirectUrl: jackson.defaultRedirectUrl.saml,
      rawMetadata:
        d.input.samlMetadata.type === 'xml' ? d.input.samlMetadata.payload : undefined!,
      metadataUrl:
        d.input.samlMetadata.type === 'url' ? d.input.samlMetadata.url : undefined
    });

    if (d.tenant.status == 'pending') {
      await db.ssoTenant.update({
        where: { oid: d.tenant.oid },
        data: { status: 'completed' }
      });
    }

    return await db.ssoConnection.create({
      data: {
        ...getId('ssoConnection'),
        tenantOid: d.tenant.oid,
        internalId: con.clientID,
        internalClientId: con.clientID,
        internalClientSecret: con.clientSecret,
        providerType: 'saml',
        providerName: d.input.provider,
        name: d.input.name,
        metadata: d.input.metadata ?? undefined
      }
    });
  }

  async createOidcConnection(d: {
    tenant: SsoTenant;
    input: {
      name: string;
      metadata?: Record<string, any>;
      provider: string;
      oidcDiscoveryUrl: string;
      clientId: string;
      clientSecret: string;
    };
  }) {
    let internalId = generatePlainId(20);

    let con = await jackson.apiController.createOIDCConnection({
      product: 'metorial',
      tenant: internalId,
      name: d.input.name,
      oidcMetadata: undefined,
      oidcDiscoveryUrl: d.input.oidcDiscoveryUrl,
      oidcClientId: d.input.clientId,
      oidcClientSecret: d.input.clientSecret,
      redirectUrl: jackson.redirectUrl,
      defaultRedirectUrl: jackson.defaultRedirectUrl.oidc
    });

    if (d.tenant.status == 'pending') {
      await db.ssoTenant.update({
        where: { oid: d.tenant.oid },
        data: { status: 'completed' }
      });
    }

    return await db.ssoConnection.create({
      data: {
        ...getId('ssoConnection'),
        tenantOid: d.tenant.oid,
        internalId,
        internalClientId: con.clientID,
        internalClientSecret: con.clientSecret,
        providerType: 'oidc',
        providerName: d.input.provider,
        name: d.input.name,
        metadata: d.input.metadata ?? undefined
      }
    });
  }

  async getConnectionsByTenant(d: { tenant: SsoTenant }) {
    return await db.ssoConnection.findMany({
      where: { tenantOid: d.tenant.oid }
    });
  }

  async getConnectionById(d: { connectionId: string; tenant: SsoTenant }) {
    let con = await db.ssoConnection.findFirst({
      where: { id: d.connectionId, tenantOid: d.tenant.oid }
    });
    if (!con) throw new ServiceError(notFoundError('sso.connection'));
    return con;
  }

  // ─── Setup ───

  async createSetup(d: {
    tenant: SsoTenant;
    input: { redirectUri: string };
  }) {
    return await db.ssoConnectionSetup.create({
      data: {
        ...getId('ssoConnectionSetup'),
        tenantOid: d.tenant.oid,
        clientSecret: await ID.generateId('ssoConnectionSetup_clientSecret'),
        redirectUri: d.input.redirectUri
      }
    });
  }

  async getSetupByClientSecret(d: { clientSecret: string }) {
    let setup = await db.ssoConnectionSetup.findUnique({
      where: { clientSecret: d.clientSecret },
      include: { tenant: true, connection: true }
    });
    if (!setup) throw new ServiceError(notFoundError('sso.setup'));
    return setup;
  }

  async createConnectionForSetup(d: {
    clientSecret: string;
    providerId: string;
    name: string;
    samlMetadata?: { type: 'xml'; payload: string } | { type: 'url'; url: string };
    oidcDiscoveryUrl?: string;
    oidcClientId?: string;
    oidcClientSecret?: string;
  }) {
    let setup = await this.getSetupByClientSecret({ clientSecret: d.clientSecret });

    if (setup.status === 'completed') {
      throw new ServiceError(badRequestError({ message: 'Setup already completed' }));
    }

    let connection: SsoConnection;

    if (d.samlMetadata) {
      connection = await this.createSamlConnection({
        tenant: setup.tenant,
        input: {
          name: d.name,
          provider: d.providerId,
          metadata: {},
          samlMetadata: d.samlMetadata
        }
      });
    } else if (d.oidcDiscoveryUrl && d.oidcClientId && d.oidcClientSecret) {
      connection = await this.createOidcConnection({
        tenant: setup.tenant,
        input: {
          name: d.name,
          provider: d.providerId,
          metadata: {},
          oidcDiscoveryUrl: d.oidcDiscoveryUrl,
          clientId: d.oidcClientId,
          clientSecret: d.oidcClientSecret
        }
      });
    } else {
      throw new ServiceError(badRequestError({ message: 'Invalid connection configuration' }));
    }

    await db.ssoConnectionSetup.update({
      where: { oid: setup.oid },
      data: { connectionOid: connection.oid, status: 'completed' }
    });

    return { setup, tenant: setup.tenant, connection };
  }

  // ─── Auth ───

  async createAuth(d: {
    tenant: SsoTenant;
    input: {
      redirectUri: string;
      email?: string;
      state: string;
    };
  }) {
    return await db.ssoAuth.create({
      data: {
        ...getId('ssoAuth'),
        clientSecret: await ID.generateId('ssoAuth_clientSecret'),
        tenantOid: d.tenant.oid,
        state: d.input.state,
        redirectUri: d.input.redirectUri,
        email: d.input.email ?? null
      }
    });
  }

  async getAuthByClientSecret(d: { clientSecret: string }) {
    let auth = await db.ssoAuth.findUnique({
      where: { clientSecret: d.clientSecret },
      include: { tenant: true }
    });
    if (!auth) throw new ServiceError(notFoundError('sso.auth'));
    return auth;
  }

  async completeAuth(d: { authId: string }) {
    let auth = await db.ssoAuth.findUnique({
      where: { id: d.authId },
      include: {
        tenant: true,
        connection: true,
        userProfile: true,
        user: true
      }
    });

    if (
      !auth ||
      auth.status != 'completed' ||
      !auth.user ||
      !auth.connection ||
      !auth.userProfile
    ) {
      throw new ServiceError(notFoundError('sso.auth'));
    }

    await db.ssoAuth.delete({ where: { oid: auth.oid } });

    return {
      auth,
      user: auth.user,
      tenant: auth.tenant,
      connection: auth.connection,
      userProfile: auth.userProfile
    };
  }

  // ─── User upsert (used during auth callback) ───

  async upsertUser(d: {
    tenant: SsoTenant;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    let existing = await db.ssoUser.findFirst({
      where: { tenantOid: d.tenant.oid, email: d.email }
    });

    if (existing) {
      return await db.ssoUser.update({
        where: { oid: existing.oid },
        data: { firstName: d.firstName, lastName: d.lastName }
      });
    }

    return await db.ssoUser.create({
      data: {
        ...getId('ssoUser'),
        tenantOid: d.tenant.oid,
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName
      }
    });
  }

  async upsertUserProfile(d: {
    tenant: SsoTenant;
    connection: SsoConnection;
    user: { oid: bigint };
    data: {
      email: string;
      uid: string;
      uidHash: string;
      sub?: string;
      firstName: string;
      lastName: string;
      roles: string[];
      groups: string[];
      raw: any;
    };
  }) {
    let existing = await db.ssoUserProfile.findFirst({
      where: {
        tenantOid: d.tenant.oid,
        userOid: d.user.oid,
        connectionOid: d.connection.oid,
        uidHash: d.data.uidHash
      }
    });

    if (existing) {
      return await db.ssoUserProfile.update({
        where: { oid: existing.oid },
        data: {
          email: d.data.email,
          uid: d.data.uid,
          sub: d.data.sub ?? null,
          firstName: d.data.firstName,
          lastName: d.data.lastName,
          roles: d.data.roles,
          groups: d.data.groups,
          raw: d.data.raw
        }
      });
    }

    return await db.ssoUserProfile.create({
      data: {
        ...getId('ssoUserProfile'),
        tenantOid: d.tenant.oid,
        connectionOid: d.connection.oid,
        userOid: d.user.oid,
        email: d.data.email,
        uid: d.data.uid,
        uidHash: d.data.uidHash,
        sub: d.data.sub ?? null,
        firstName: d.data.firstName,
        lastName: d.data.lastName,
        roles: d.data.roles,
        groups: d.data.groups,
        raw: d.data.raw
      }
    });
  }
}

export let ssoService = new SsoServiceImpl();
