import { auditLogService } from '@metorial-enterprise/federation-audit-log';
import { federationDB } from '@metorial-enterprise/federation-data';
import { Context } from '@metorial/context';
import { forbiddenError, ServiceError } from '@metorial/error';
import { Service } from '@metorial/service';
import { addMinutes, subMinutes } from 'date-fns';

class AuthBlockServiceImpl {
  async checkBlocked(i: { email: string; context: Context }) {
    let block = await federationDB.authBlock.findFirst({
      where: {
        blockedUntil: { gt: new Date() },
        OR: [
          {
            identifier: i.email,
            identifierType: 'email'
          }
        ]
      }
    });

    if (block) {
      throw new ServiceError(
        forbiddenError({
          message: `To secure your account, we have temporarily blocked access to it. Please try again later.`
        })
      );
    }
  }

  async blockIfNeeded(i: { email: string; context: Context }) {
    let authActionsFromEmail = await federationDB.authIntent.count({
      where: {
        identifier: i.email,
        identifierType: 'email',
        createdAt: { gt: subMinutes(new Date(), 10) }
      }
    });

    if (authActionsFromEmail > 15) {
      await federationDB.authBlock.create({
        data: {
          blockedUntil: addMinutes(new Date(), 60),
          identifier: i.email,
          identifierType: 'email',
          ip: i.context.ip
        }
      });

      let user = await federationDB.enterpriseUser.findFirst({
        where: {
          emails: { some: { email: i.email } }
        }
      });

      if (user) {
        await auditLogService.createAuditLog({
          object: 'user',
          action: 'block',
          target: { id: user.id, name: user.name },
          actor: { type: 'user', user },
          context: i.context,
          payload: { email: i.email }
        });
      }
    }
  }

  async registerBlock(i: { email: string; context: Context }) {
    await this.checkBlocked(i);
    await this.blockIfNeeded(i);
  }
}

export let authBlockService = Service.create(
  'AuthBlockService',
  () => new AuthBlockServiceImpl()
).build();
