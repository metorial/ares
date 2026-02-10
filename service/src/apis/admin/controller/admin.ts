import { flagsService } from '@metorial-enterprise/federation-flags';
import { handoffService, idAdminService } from '@metorial-enterprise/federation-id';
import { islandAdminService } from '@metorial-enterprise/federation-islands';
import {
  companyService,
  enterpriseOnboardingService
} from '@metorial-enterprise/federation-organization';
import { checkoutIntentPresenter } from '@metorial-enterprise/federation-payment';
import {
  campaignPlanService,
  subscriptionAdminService
} from '@metorial-enterprise/federation-subscription';
import {} from '@metorial-enterprise/island-federation';
import { badRequestError, ServiceError } from '@metorial/error';
import { v } from '@metorial/validation';
import { adminApp } from '../middleware/admin';

export let adminController = adminApp.controller({
  check: adminApp.handler().do(async () => {
    return { status: 'ok' };
  }),

  listUsers: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.listUsers(input)),

  getUser: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => idAdminService.getUser(input)),

  impersonateUser: adminApp
    .handler()
    .input(
      v.object({
        id: v.string(),
        reason: v.string()
      })
    )
    .do(async ({ input, admin }) =>
      idAdminService.impersonateUser({
        ...input,
        admin
      })
    ),

  listOrganizations: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.listOrganizations(input)),

  getOrganization: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => idAdminService.getOrganization(input)),

  listAdmins: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.listAdmins(input)),

  getAuthConfig: adminApp.handler().do(async ({ input }) => idAdminService.getAuthConfig()),

  updateAuthConfig: adminApp
    .handler()
    .input(
      v.object({
        hasWhitelist: v.boolean()
      })
    )
    .do(async ({ input }) => idAdminService.updateAuthConfig(input)),

  listInvites: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.listInvites(input)),

  createInvite: adminApp
    .handler()
    .input(
      v.object({
        email: v.string(),
        title: v.optional(v.string()),
        message: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.createInvite(input)),

  listPlans: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.optional(v.string())
      })
    )
    .do(async ({ input }) =>
      subscriptionAdminService.listPlans({
        organizationId: input.organizationId
      })
    ),

  getOrganizationPlan: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string()
      })
    )
    .do(async ({ input }) => subscriptionAdminService.getOrganizationPlan(input)),

  setOrganizationPlan: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        planId: v.string()
      })
    )
    .do(async ({ input }) => subscriptionAdminService.setOrganizationPlan(input)),

  setOrganizationPlanPaid: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        planId: v.string(),
        backUrl: v.string({ modifiers: [v.url()] })
      })
    )
    .do(async ({ input }) => {
      let res = await subscriptionAdminService.setOrganizationPlanPaid(input);

      if (res.type == 'checkout') {
        return {
          ...res,
          fullCheckout: checkoutIntentPresenter(res.checkout)
        };
      }

      return res;
    }),

  cancelOrganizationPlanPaid: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        planId: v.string()
      })
    )
    .do(async ({ input }) => subscriptionAdminService.cancelOrganizationPlanPaid(input)),

  getOrganizationFlags: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string()
      })
    )
    .do(async ({ input }) => {
      let organization = await idAdminService.getOrganization({ id: input.organizationId });

      return flagsService.getFlagsForOrganization({
        organization
      });
    }),

  assignFlagToOrganization: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        flagId: v.string(),
        value: v.string()
      })
    )
    .do(async ({ input }) => {
      let organization = await idAdminService.getOrganization({ id: input.organizationId });

      let value: any = input.value;
      try {
        value = JSON.parse(value);
      } catch (error) {}

      return flagsService.assignFlagToOrganization({
        organization,
        flagId: input.flagId,
        value
      });
    }),

  assignBetaToOrganization: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        betaId: v.string(),
        status: v.enumOf(['active', 'inactive'])
      })
    )
    .do(async ({ input }) => {
      let organization = await idAdminService.getOrganization({ id: input.organizationId });

      return flagsService.assignBetaToOrganization({
        organization,
        betaId: input.betaId,
        status: input.status,
        assignedBy: 'metorial'
      });
    }),

  assignCohortToOrganization: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),
        cohortId: v.string(),
        status: v.enumOf(['active', 'inactive'])
      })
    )
    .do(async ({ input }) => {
      let organization = await idAdminService.getOrganization({ id: input.organizationId });

      return flagsService.assignCohortToOrganization({
        organization,
        cohortId: input.cohortId,
        status: input.status
      });
    }),

  listEarlyAccessRegistrations: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => idAdminService.listEarlyAccessRegistrations(input)),

  createCompany: adminApp
    .handler()
    .input(
      v.object({
        name: v.string(),
        domain: v.string()
      })
    )
    .do(async ({ input, admin }) =>
      companyService.createCompany({
        createdBy: admin,
        input: {
          name: input.name,
          domain: input.domain,
          image: { type: 'default' }
        }
      })
    ),

  listCompanies: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => companyService.adminListCompanies(input)),

  getCompany: adminApp
    .handler()
    .input(
      v.object({
        id: v.string()
      })
    )
    .do(async ({ input }) => companyService.adminGetCompany({ companyId: input.id })),

  sendCompanySlackInvite: adminApp
    .handler()
    .input(
      v.object({
        companyId: v.string()
      })
    )
    .do(async ({ input }) => {
      let company = await companyService.adminGetCompany({ companyId: input.companyId });

      await enterpriseOnboardingService.admin_inviteToSlack({
        company
      });
    }),

  addPersonToCompany: adminApp
    .handler()
    .input(
      v.object({
        companyId: v.string(),
        email: v.string(),
        firstName: v.string(),
        lastName: v.string()
      })
    )
    .do(async ({ input, admin }) => {
      let company = await companyService.adminGetCompany({ companyId: input.companyId });

      return companyService.adminAddPersonToCompany({
        company,
        createdBy: admin,
        input: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName
        }
      });
    }),

  createEnterpriseOnboarding: adminApp
    .handler()
    .input(
      v.object({
        companyId: v.string(),
        personId: v.string()
      })
    )
    .do(async ({ input, admin }) => {
      let company = await companyService.adminGetCompany({ companyId: input.companyId });
      let person = await companyService.adminGetCompanyPerson({
        companyId: input.companyId,
        personId: input.personId
      });

      return enterpriseOnboardingService.createOnboarding({
        createdBy: admin,
        company,
        person
      });
    }),

  listServerListings: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string()),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.listServerListings({
        island: input.island,
        after: input.after,
        search: input.search
      })
    ),

  getServerListing: adminApp
    .handler()
    .input(
      v.object({
        serverListingId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.getServerListing({
        island: input.island,
        serverListingId: input.serverListingId
      })
    ),

  updateServerListing: adminApp
    .handler()
    .input(
      v.object({
        serverListingId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default']),

        name: v.string(),
        slug: v.string(),
        description: v.string(),
        readme: v.optional(v.string()),
        isVerified: v.boolean(),
        isOfficial: v.boolean(),
        isMetorial: v.boolean(),
        isPublic: v.boolean(),
        rank: v.optional(v.number()),
        imageUrl: v.optional(v.string()),

        skills: v.optional(v.array(v.string())),
        categories: v.optional(v.array(v.string()))
      })
    )
    .do(async ({ input }) =>
      islandAdminService.updateServerListing({
        island: input.island,
        serverListingId: input.serverListingId,

        name: input.name,
        slug: input.slug,
        description: input.description,
        readme: input.readme,
        imageUrl: input.imageUrl,

        isVerified: input.isVerified,
        isOfficial: input.isOfficial,
        isMetorial: input.isMetorial,
        isPublic: input.isPublic,

        rank: input.rank,

        skills: input.skills,
        categories: input.categories
      })
    ),

  listProfiles: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string()),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.listProfiles({
        island: input.island,
        after: input.after,
        search: input.search
      })
    ),

  getProfile: adminApp
    .handler()
    .input(
      v.object({
        profileId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.getProfile({
        island: input.island,
        profileId: input.profileId
      })
    ),

  updateProfile: adminApp
    .handler()
    .input(
      v.object({
        profileId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default']),

        name: v.string(),
        slug: v.string(),
        description: v.string(),
        isVerified: v.boolean(),
        isOfficial: v.boolean(),
        isMetorial: v.boolean(),
        imageUrl: v.optional(v.string())
      })
    )
    .do(async ({ input }) =>
      islandAdminService.updateProfile({
        island: input.island,
        profileId: input.profileId,

        name: input.name,
        slug: input.slug,
        description: input.description,

        isVerified: input.isVerified,
        isOfficial: input.isOfficial,
        isMetorial: input.isMetorial,

        imageUrl: input.imageUrl
      })
    ),

  listServerCollections: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string()),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.listServerCollections({
        island: input.island,
        after: input.after,
        search: input.search
      })
    ),

  getServerCollection: adminApp
    .handler()
    .input(
      v.object({
        serverCollectionId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.getServerCollection({
        island: input.island,
        serverCollectionId: input.serverCollectionId
      })
    ),

  updateServerCollection: adminApp
    .handler()
    .input(
      v.object({
        serverCollectionId: v.string(),
        island: v.enumOf(['metorial_hosted_fed_default']),

        serverIds: v.array(v.string())
      })
    )
    .do(async ({ input }) =>
      islandAdminService.updateServerCollection({
        island: input.island,
        serverCollectionId: input.serverCollectionId,

        serverIds: input.serverIds
      })
    ),

  listHandoffApplications: adminApp
    .handler()
    .input(
      v.object({
        search: v.optional(v.string()),
        after: v.optional(v.string())
      })
    )
    .do(async ({ input }) => handoffService.ADMIN_listHandoffApplications({})),

  getHandoffApplication: adminApp
    .handler()
    .input(
      v.object({
        handoffApplicationId: v.string()
      })
    )
    .do(async ({ input }) =>
      handoffService.ADMIN_getHandoffApplication({
        handoffApplicationId: input.handoffApplicationId
      })
    ),

  updateHandoffApplication: adminApp
    .handler()
    .input(
      v.object({
        handoffApplicationId: v.string(),
        name: v.string(),
        redirectUris: v.array(v.string({ modifiers: [v.url()] }))
      })
    )
    .do(async ({ input }) =>
      handoffService.ADMIN_updateHandoffApplication({
        handoffApplicationId: input.handoffApplicationId,
        input: { name: input.name, redirectUris: input.redirectUris }
      })
    ),

  createHandoffApplication: adminApp
    .handler()
    .input(
      v.object({
        name: v.string(),
        redirectUris: v.array(v.string({ modifiers: [v.url()] }))
      })
    )
    .do(async ({ input }) =>
      handoffService.ADMIN_createHandoffApplication({
        input: { name: input.name, redirectUris: input.redirectUris }
      })
    ),

  manuallyStartServerSync: adminApp
    .handler()
    .input(v.object({}))
    .do(async ({ input }) => islandAdminService.manuallyStartServerSync()),

  listServerSyncJobs: adminApp
    .handler()
    .input(
      v.object({
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.listSyncJobs({
        island: input.island
      })
    ),

  indexServerDeployments: adminApp
    .handler()
    .input(v.object({}))
    .do(async ({ input }) => islandAdminService.indexServerDeployments()),

  listServerDeploymentIndexJobs: adminApp
    .handler()
    .input(
      v.object({
        island: v.enumOf(['metorial_hosted_fed_default'])
      })
    )
    .do(async ({ input }) =>
      islandAdminService.listServerDeploymentIndexJobs({
        island: input.island
      })
    ),

  onboardSelfHosted: adminApp
    .handler()
    .input(
      v.object({
        companyId: v.string()
      })
    )
    .do(async ({ input, admin }) => {
      let company = await companyService.adminGetCompany({ companyId: input.companyId });

      let res = await fetch('https://licenses.metorial.com/api/v1/ingest-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LICENSE_SERVICE_API_KEY}`
        },
        body: JSON.stringify({
          tenantName: company.name,
          users: company.people.map(person => ({
            email: person.email,
            name: `${person.firstName} ${person.lastName}`
          }))
        })
      });

      if (!res.ok) {
        throw new ServiceError(
          badRequestError({
            message: `Failed to onboard self-hosted tenant: ${res.status} ${await res.text()}`
          })
        );
      }

      return { success: true };
    }),

  createCustomPlan: adminApp
    .handler()
    .input(
      v.object({
        organizationId: v.string(),

        name: v.string(),
        description: v.optional(v.string()),
        unitAmountInCents: v.number(),
        currency: v.enumOf(['USD']),
        interval: v.enumOf(['month']),

        features: v.array(
          v.object({
            slug: v.string(),
            value: v.union([v.number(), v.boolean(), v.string()])
          })
        ),

        meters: v.array(
          v.object({
            slug: v.string(),
            includedAmount: v.number()
          })
        )
      })
    )
    .do(async ({ input }) =>
      subscriptionAdminService.createCustomPlan({
        organizationId: input.organizationId,

        input: {
          name: input.name,
          description: input.description,
          unitAmountInCents: input.unitAmountInCents,
          currency: input.currency,
          interval: input.interval
        },

        features: input.features,
        meters: input.meters
      })
    ),

  listMeters: adminApp.handler().do(async () => subscriptionAdminService.listMeters()),

  listFeatures: adminApp.handler().do(async () => subscriptionAdminService.listFeatures()),

  addOrganizationToCompany: adminApp
    .handler()
    .input(
      v.object({
        companyId: v.string(),
        organizationId: v.string()
      })
    )
    .do(async ({ input }) => {
      let company = await companyService.adminGetCompany({ companyId: input.companyId });

      return companyService.addOrganizationToCompany({
        company,
        organizationId: input.organizationId
      });
    }),

  listCampaignPlans: adminApp
    .handler()
    .input(v.object({}))
    .do(async ({ input }) => campaignPlanService.listCampaignPlans()),

  getCampaignPlan: adminApp
    .handler()
    .input(
      v.object({
        campaignPlanId: v.string()
      })
    )
    .do(async ({ input }) =>
      campaignPlanService.getCampaignPlan({ campaignPlanId: input.campaignPlanId })
    ),

  createCampaignPlan: adminApp
    .handler()
    .input(
      v.object({
        name: v.string(),
        planId: v.string(),
        startsAt: v.date(),
        endsAt: v.date(),
        welcomeMessage: v.string()
      })
    )
    .do(async ({ input }) =>
      campaignPlanService.createCampaignPlan({
        input: {
          name: input.name,
          planId: input.planId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          welcomeMessage: input.welcomeMessage
        }
      })
    ),

  addCampaignPlanSubjects: adminApp
    .handler()
    .input(
      v.object({
        campaignPlanId: v.string(),
        subjects: v.array(
          v.object({
            type: v.enumOf(['user']),
            email: v.string()
          })
        )
      })
    )
    .do(async ({ input }) => {
      let campaignPlan = await campaignPlanService.getCampaignPlan({
        campaignPlanId: input.campaignPlanId
      });

      return campaignPlanService.addCampaignPlanSubjects({
        campaignPlan,
        subjects: input.subjects
      });
    }),

  getSsoSetupUrl: adminApp
    .handler()
    .input(
      v.object({
        redirectUri: v.string({ modifiers: [v.url()] }),
        tenantName: v.string()
      })
    )
    .do(async ({ input }) =>
      idAdminService.getSsoSetupUrl({
        redirectUri: input.redirectUri,
        tenantName: input.tenantName
      })
    ),

  setSsoTenantForAdminAuth: adminApp
    .handler()
    .input(
      v.object({
        tenantId: v.string()
      })
    )
    .do(async ({ input }) =>
      idAdminService.setSsoTenantForAdminAuth({ tenantId: input.tenantId })
    ),

  setSsoTenantForAuth: adminApp
    .handler()
    .input(
      v.object({
        tenantId: v.string()
      })
    )
    .do(async ({ input }) => idAdminService.setSsoTenantForAuth({ tenantId: input.tenantId }))
});
