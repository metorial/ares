import { createLoader } from '@metorial/data-hooks';
import { isServiceError } from '@metorial/error';
import { adminClient } from './client';

let redirectToAuthIfNotAuthenticated = async <R>(fn: () => Promise<R>) => {
  if (typeof window === 'undefined') new Promise(() => {}) as Promise<R>;

  try {
    return await fn();
  } catch (err) {
    if (isServiceError(err) && err.data.code == 'unauthorized') {
      window.location.replace('/login');

      // Noop promise to stop execution while redirecting
      return new Promise(() => {}) as Promise<R>;
    }

    throw err;
  }
};

export let usersState = createLoader({
  name: 'users',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listUsers({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {}
});

export let userState = createLoader({
  name: 'user',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getUser({
        id: d.id
      })
    );
  },
  mutators: {
    impersonate: (d: { reason: string }, { output }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.impersonateUser({
          id: output.id,
          reason: d.reason
        })
      );
    }
  }
});

export let organizationsState = createLoader({
  name: 'organizations',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listOrganizations({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {}
});

export let organizationState = createLoader({
  name: 'organization',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getOrganization({
        id: d.id
      })
    );
  },
  mutators: {
    linkCompany: (d: { companyId: string; organizationId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.addOrganizationToCompany({
          organizationId: d.organizationId,
          companyId: d.companyId
        })
      );
    }
  }
});

export let bootState = createLoader({
  name: 'boot',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.authentication.boot({}));
  },
  mutators: {}
});

export let adminsState = createLoader({
  name: 'admins',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listAdmins({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {}
});

export let authConfigState = createLoader({
  name: 'authConfig',
  fetch: (d: void) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.getAuthConfig({}));
  },
  mutators: {
    update: (d: { hasWhitelist: boolean }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.updateAuthConfig({
          hasWhitelist: d.hasWhitelist
        })
      );
    },

    getSsoSetupUrl: (d: { redirectUri: string; tenantName: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.getSsoSetupUrl({
          redirectUri: d.redirectUri,
          tenantName: d.tenantName
        })
      );
    },

    setSsoTenantForAdminAuth: (d: { tenantId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.setSsoTenantForAdminAuth({
          tenantId: d.tenantId
        })
      );
    },

    setSsoTenantForAuth: (d: { tenantId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.setSsoTenantForAuth({
          tenantId: d.tenantId
        })
      );
    }
  }
});

export let invitesState = createLoader({
  name: 'invites',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listInvites({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {
    create: (d: { email: string; title?: string; message?: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.createInvite({
          email: d.email,
          title: d.title,
          message: d.message
        })
      );
    }
  }
});

export let plansState = createLoader({
  name: 'plans',
  fetch: (d: { organizationId?: string }) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.listPlans(d));
  },
  mutators: {
    createCustomPlan: (d: {
      organizationId: string;

      name: string;
      description?: string;
      unitAmountInCents: number;
      currency: 'USD';
      interval: 'month';

      features: {
        slug: string;
        value: number | boolean | string;
      }[];

      meters: {
        slug: string;
        includedAmount: number;
      }[];
    }) => {
      return redirectToAuthIfNotAuthenticated(() => adminClient.admin.createCustomPlan(d));
    }
  }
});

export let organizationPlanState = createLoader({
  name: 'orgPlan',
  fetch: (d: { organizationId: string }) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.getOrganizationPlan(d));
  },
  mutators: {
    setOrganizationPlan: (d: { organizationId: string; planId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.setOrganizationPlan({
          organizationId: d.organizationId,
          planId: d.planId
        })
      );
    },

    setOrganizationPlanPaid: (d: {
      organizationId: string;
      planId: string;
      backUrl: string;
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.setOrganizationPlanPaid({
          organizationId: d.organizationId,
          planId: d.planId,
          backUrl: d.backUrl
        })
      );
    },

    cancelOrganizationPlanPaid: (d: { organizationId: string; planId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.cancelOrganizationPlanPaid({
          organizationId: d.organizationId,
          planId: d.planId
        })
      );
    }
  }
});

export let organizationFlagsState = createLoader({
  name: 'orgFlags',
  fetch: (d: { organizationId: string }) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.getOrganizationFlags(d));
  },
  mutators: {
    assignFlagToOrganization: (d: {
      organizationId: string;
      flagId: string;
      value: string;
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.assignFlagToOrganization({
          organizationId: d.organizationId,
          flagId: d.flagId,
          value: d.value
        })
      );
    },

    setOrganizationCohort: (d: {
      organizationId: string;
      cohortId: string;
      status: 'active' | 'inactive';
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.assignCohortToOrganization({
          organizationId: d.organizationId,
          cohortId: d.cohortId,
          status: d.status
        })
      );
    },

    setOrganizationBeta: (d: {
      organizationId: string;
      betaId: string;
      status: 'active' | 'inactive';
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.assignBetaToOrganization({
          organizationId: d.organizationId,
          betaId: d.betaId,
          status: d.status
        })
      );
    }
  }
});

export let earlyAccessState = createLoader({
  name: 'earlyAccess',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listEarlyAccessRegistrations({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {}
});

export let companiesState = createLoader({
  name: 'companies',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listCompanies({
        search: d.search,
        after: d.after
      })
    );
  },
  mutators: {
    create: (d: { name: string; domain: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.createCompany({
          name: d.name,
          domain: d.domain
        })
      );
    }
  }
});

export let companyState = createLoader({
  name: 'company',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getCompany({
        id: d.id
      })
    );
  },
  mutators: {
    addPerson: (d: {
      companyId: string;
      email: string;
      firstName: string;
      lastName: string;
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.addPersonToCompany({
          companyId: d.companyId,
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName
        })
      );
    },

    createOnboarding: (d: { companyId: string; personId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.createEnterpriseOnboarding({
          companyId: d.companyId,
          personId: d.personId
        })
      );
    },

    sendCompanySlackInvite: (d: { companyId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.sendCompanySlackInvite({
          companyId: d.companyId
        })
      );
    },

    onboardSelfHosted: (d: { companyId: string }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.onboardSelfHosted({
          companyId: d.companyId
        })
      );
    }
  }
});

export let profilesState = createLoader({
  name: 'profiles',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listProfiles({
        search: d.search,
        after: d.after,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {}
});

export let profileState = createLoader({
  name: 'profile',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getProfile({
        profileId: d.id,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {
    update: (
      d: {
        name: string;
        slug: string;
        description: string;
        isVerified: boolean;
        isOfficial: boolean;
        isMetorial: boolean;
        imageUrl?: string;
      },
      { output }
    ) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.updateProfile({
          profileId: output!.id,
          island: 'metorial_hosted_fed_default',

          name: d.name,
          slug: d.slug,
          description: d.description,

          isVerified: d.isVerified,
          isOfficial: d.isOfficial,
          isMetorial: d.isMetorial,

          imageUrl: d.imageUrl
        })
      );
    }
  }
});

export let serverListingsState = createLoader({
  name: 'serverListings',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listServerListings({
        search: d.search,
        after: d.after,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {}
});

export let serverListingState = createLoader({
  name: 'serverListing',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getServerListing({
        serverListingId: d.id,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {
    update: (
      d: {
        name: string;
        slug: string;
        description: string;
        readme: string;
        isVerified: boolean;
        isOfficial: boolean;
        isMetorial: boolean;
        isPublic: boolean;
        rank: number;
        imageUrl?: string;
        skills: string[];
        categories?: string[];
      },
      { output }
    ) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.updateServerListing({
          serverListingId: output!.id,
          island: 'metorial_hosted_fed_default',
          ...d
        })
      );
    }
  }
});

export let serverCollectionsState = createLoader({
  name: 'serverCollections',
  fetch: (d: { search?: string; after?: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listServerCollections({
        search: d.search,
        after: d.after,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {}
});

export let serverCollectionState = createLoader({
  name: 'serverCollection',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getServerCollection({
        serverCollectionId: d.id,
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {
    update: (
      d: {
        serverIds: string[];
      },
      { output }
    ) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.updateServerCollection({
          serverCollectionId: output!.id,
          island: 'metorial_hosted_fed_default',

          serverIds: d.serverIds
        })
      );
    }
  }
});

export let manuallyStartServerSync = () =>
  redirectToAuthIfNotAuthenticated(() => adminClient.admin.manuallyStartServerSync({}));

export let serverSyncJobsState = createLoader({
  name: 'serverSyncJobs',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listServerSyncJobs({
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {}
});

export let indexServerDeployments = () =>
  redirectToAuthIfNotAuthenticated(() => adminClient.admin.indexServerDeployments({}));

export let listServerDeploymentIndexJobsState = createLoader({
  name: 'listServerDeploymentIndexJobs',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listServerDeploymentIndexJobs({
        island: 'metorial_hosted_fed_default'
      })
    );
  },
  mutators: {}
});

export let handoffApplicationsState = createLoader({
  name: 'handoffApplications',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.listHandoffApplications({})
    );
  },
  mutators: {
    create: (d: { name: string; redirectUris: string[] }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.createHandoffApplication({
          name: d.name,
          redirectUris: d.redirectUris
        })
      );
    }
  }
});

export let handoffApplicationState = createLoader({
  name: 'handoffApplication',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getHandoffApplication({
        handoffApplicationId: d.id
      })
    );
  },
  mutators: {
    update: (
      d: {
        name: string;
        redirectUris: string[];
      },
      { output }
    ) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.updateHandoffApplication({
          handoffApplicationId: output!.id,

          name: d.name,
          redirectUris: d.redirectUris
        })
      );
    }
  }
});

export let metersState = createLoader({
  name: 'meters',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.listMeters({}));
  },
  mutators: {}
});

export let featuresState = createLoader({
  name: 'features',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.listFeatures({}));
  },
  mutators: {}
});

export let planCampaignsState = createLoader({
  name: 'planCampaigns',
  fetch: (d: {}) => {
    return redirectToAuthIfNotAuthenticated(() => adminClient.admin.listCampaignPlans({}));
  },
  mutators: {
    create: (d: {
      name: string;
      planId: string;
      startsAt: Date;
      endsAt: Date;
      welcomeMessage: string;
    }) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.createCampaignPlan({
          name: d.name,
          planId: d.planId,
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          welcomeMessage: d.welcomeMessage
        })
      );
    }
  }
});

export let planCampaignState = createLoader({
  name: 'planCampaign',
  fetch: (d: { id: string }) => {
    return redirectToAuthIfNotAuthenticated(() =>
      adminClient.admin.getCampaignPlan({
        campaignPlanId: d.id
      })
    );
  },
  mutators: {
    addSubjects: (
      d: {
        subjects: {
          type: 'user';
          email: string;
        }[];
      },
      { input }
    ) => {
      return redirectToAuthIfNotAuthenticated(() =>
        adminClient.admin.addCampaignPlanSubjects({
          campaignPlanId: input.id,
          subjects: d.subjects
        })
      );
    }
  }
});
