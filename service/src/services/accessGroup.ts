import { notFoundError, ServiceError } from '@lowerdeck/error';
import type { User } from '../../prisma/generated/client';
import { db } from '../db';
import { getId } from '../id';

let include = {
  rules: true,
  assignments: {
    include: {
      app: { select: { id: true, clientId: true } }
    }
  }
};

class AccessGroupServiceImpl {
  async get(d: { accessGroupId: string }) {
    let accessGroup = await db.accessGroup.findUnique({
      where: { id: d.accessGroupId },
      include
    });
    if (!accessGroup) throw new ServiceError(notFoundError('accessGroup'));
    return accessGroup;
  }

  async list(d: { appOid: bigint }) {
    return await db.accessGroup.findMany({
      where: { appOid: d.appOid },
      include,
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(d: { appOid: bigint; name: string; rules: { type: string; value: string }[] }) {
    return await db.accessGroup.create({
      data: {
        ...getId('accessGroup'),
        appOid: d.appOid,
        name: d.name,
        rules: {
          create: d.rules.map(rule => ({
            ...getId('accessGroupRule'),
            type: rule.type,
            value: rule.value
          }))
        }
      },
      include
    });
  }

  async update(d: {
    accessGroupId: string;
    name?: string;
    rules?: { type: string; value: string }[];
  }) {
    let accessGroup = await this.get({ accessGroupId: d.accessGroupId });

    if (d.rules) {
      await db.accessGroupRule.deleteMany({
        where: { accessGroupOid: accessGroup.oid }
      });

      await db.accessGroupRule.createMany({
        data: d.rules.map(rule => ({
          ...getId('accessGroupRule'),
          accessGroupOid: accessGroup.oid,
          type: rule.type,
          value: rule.value
        }))
      });
    }

    return await db.accessGroup.update({
      where: { oid: accessGroup.oid },
      data: {
        name: d.name ?? undefined
      },
      include
    });
  }

  async delete(d: { accessGroupId: string }) {
    let accessGroup = await this.get({ accessGroupId: d.accessGroupId });
    await db.accessGroup.delete({ where: { oid: accessGroup.oid } });
  }

  // ─── Assignments ───

  async assignToApp(d: { accessGroupId: string; appId: string }) {
    let accessGroup = await this.get({ accessGroupId: d.accessGroupId });
    let app = await db.app.findUnique({ where: { id: d.appId } });
    if (!app) throw new ServiceError(notFoundError('app'));

    return await db.accessGroupAssignment.create({
      data: {
        ...getId('accessGroupAssignment'),
        accessGroupOid: accessGroup.oid,
        appOid: app.oid
      }
    });
  }

  async unassign(d: { assignmentId: string }) {
    let assignment = await db.accessGroupAssignment.findUnique({
      where: { id: d.assignmentId }
    });
    if (!assignment) throw new ServiceError(notFoundError('accessGroupAssignment'));
    await db.accessGroupAssignment.delete({ where: { oid: assignment.oid } });
  }

  async listAssignmentsForApp(d: { appOid: bigint }) {
    return await db.accessGroupAssignment.findMany({
      where: { appOid: d.appOid },
      include: {
        accessGroup: {
          include: { _count: { select: { rules: true } } }
        }
      }
    });
  }

  // ─── Access Checks ───

  async checkAppAccess(d: { user: User; appOid: bigint }): Promise<boolean> {
    let assignments = await db.accessGroupAssignment.findMany({
      where: { appOid: d.appOid },
      include: { accessGroup: { include: { rules: true } } }
    });

    // No access groups assigned → all users allowed
    if (assignments.length === 0) return true;

    // User must match at least one access group
    for (let assignment of assignments) {
      let matched = await this._checkRules({
        user: d.user,
        rules: assignment.accessGroup.rules,
        appOid: d.appOid
      });
      if (matched) return true;
    }

    return false;
  }

  async checkAccess(d: { user: User; accessGroupId: string }): Promise<boolean> {
    let accessGroup = await db.accessGroup.findUnique({
      where: { id: d.accessGroupId },
      include: { rules: true }
    });
    if (!accessGroup) return false;

    return this._checkRules({
      user: d.user,
      rules: accessGroup.rules,
      appOid: accessGroup.appOid
    });
  }

  async checkAccessByOid(d: { user: User; accessGroupOid: bigint }): Promise<boolean> {
    let accessGroup = await db.accessGroup.findUnique({
      where: { oid: d.accessGroupOid },
      include: { rules: true }
    });
    if (!accessGroup) return false;

    return this._checkRules({
      user: d.user,
      rules: accessGroup.rules,
      appOid: accessGroup.appOid
    });
  }

  private async _checkRules(d: {
    user: User;
    rules: { type: string; value: string }[];
    appOid: bigint;
  }): Promise<boolean> {
    if (d.rules.length === 0) return false;

    let rulesByType = new Map<string, string[]>();
    for (let rule of d.rules) {
      let values = rulesByType.get(rule.type);
      if (!values) {
        values = [];
        rulesByType.set(rule.type, values);
      }
      values.push(rule.value);
    }

    let verifiedEmails: string[] | null = null;
    let getVerifiedEmails = async () => {
      if (verifiedEmails) return verifiedEmails;
      let emails = await db.userEmail.findMany({
        where: { userOid: d.user.oid, verifiedAt: { not: null } }
      });
      verifiedEmails = emails.map(e => e.email);
      return verifiedEmails;
    };

    // email rules
    let emailValues = rulesByType.get('email');
    if (emailValues) {
      let match = await db.userEmail.findFirst({
        where: {
          userOid: d.user.oid,
          verifiedAt: { not: null },
          email: { in: emailValues }
        }
      });
      if (match) return true;
    }

    // email_domain rules
    let domainValues = rulesByType.get('email_domain');
    if (domainValues) {
      let match = await db.userEmail.findFirst({
        where: {
          userOid: d.user.oid,
          verifiedAt: { not: null },
          domain: { domain: { in: domainValues } }
        }
      });
      if (match) return true;
    }

    // For SSO rules, we need the user's verified emails and the app's SSO tenants
    let ssoRuleTypes = ['sso_tenant', 'sso_group', 'sso_role'];
    let hasSsoRules = ssoRuleTypes.some(t => rulesByType.has(t));

    if (hasSsoRules) {
      let emails = await getVerifiedEmails();
      if (emails.length === 0) return false;

      let tenants = await db.ssoTenant.findMany({
        where: { OR: [{ appOid: d.appOid }, { isGlobal: true }] },
        select: { oid: true }
      });
      let tenantOids = tenants.map(t => t.oid);
      if (tenantOids.length === 0) return false;

      // sso_tenant rules
      let ssoTenantValues = rulesByType.get('sso_tenant');
      if (ssoTenantValues) {
        let matchingTenants = await db.ssoTenant.findMany({
          where: {
            OR: [{ appOid: d.appOid }, { isGlobal: true }],
            id: { in: ssoTenantValues }
          },
          select: { oid: true }
        });
        if (matchingTenants.length > 0) {
          let match = await db.ssoUserProfile.findFirst({
            where: {
              tenantOid: { in: matchingTenants.map(t => t.oid) },
              email: { in: emails }
            }
          });
          if (match) return true;
        }
      }

      // sso_group rules
      let ssoGroupValues = rulesByType.get('sso_group');
      if (ssoGroupValues) {
        let match = await db.ssoUserProfile.findFirst({
          where: {
            tenantOid: { in: tenantOids },
            email: { in: emails },
            groups: { hasSome: ssoGroupValues }
          }
        });
        if (match) return true;
      }

      // sso_role rules
      let ssoRoleValues = rulesByType.get('sso_role');
      if (ssoRoleValues) {
        let match = await db.ssoUserProfile.findFirst({
          where: {
            tenantOid: { in: tenantOids },
            email: { in: emails },
            roles: { hasSome: ssoRoleValues }
          }
        });
        if (match) return true;
      }
    }

    return false;
  }
}

export let accessGroupService = new AccessGroupServiceImpl();
