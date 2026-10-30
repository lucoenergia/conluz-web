import {
  PlantResponseInverterProvider,
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementReferenceResponseStatus,
  SharingAgreementResponseStatus,
  type CommunityAdminResponse,
  type CommunityCapabilitiesResponse,
  type CommunityResponse,
  type ContactChannelResponse,
  type CurrentUserResponse,
  type MemberRecordResponse,
  type MemberResponse,
  type MembershipCapabilitiesResponse,
  type MembershipEnergyMetricsResponse,
  type MembershipHourlyProfileBucketResponse,
  type MembershipHourlyProfileResponse,
  type MembershipMonthlyConsumptionBucketResponse,
  type MembershipPaybackResponse,
  type MembershipResponse,
  type OperatorContactResponse,
  type PartitionCoefficientResponse,
  type PlantCapabilitiesResponse,
  type PlantResponse,
  type PartitionCoefficientCapabilitiesResponse,
  type PlatformAdminCapabilitiesResponse,
  type PlatformAdminResponse,
  type PlatformCapabilitiesResponse,
  type SharingAgreementCapabilitiesResponse,
  type SharingAgreementPartitionCoefficientResponse,
  type SharingAgreementResponse,
  type SupplyCapabilitiesResponse,
  type SupplyReferenceResponse,
  type SupplyResponse,
  type UserCapabilitiesResponse,
  type UserResponse,
} from "../api/models";

/**
 * Typed fixture builders. Defaults satisfy the generated response types and
 * are deliberately distinctive: obviously synthetic strings, and non-zero
 * sentinels where zero is a meaningful domain value. A spec that silently
 * depends on a default then shows it in its failure output instead of passing
 * by accident, so specs override every value they assert on.
 *
 * Some fields keep a plain value:
 * - nullables stay null;
 * - fields that grant access (`memberships`, `isPlatformAdmin`) stay at least
 *   privilege, because a distinctive value there would change gating rather
 *   than text;
 * - lifecycle enums start at the beginning of the lifecycle (a DRAFT
 *   agreement, a PENDING and OPEN coefficient), the only combination that is
 *   valid on its own. A DRAFT agreement can never have APPLIED coefficients.
 */

/**
 * Capability builders. Every capability defaults to `false`, which is the same
 * least-privilege rule the response builders already follow for `memberships`
 * and `isPlatformAdmin`: a default that grants access would change gating
 * rather than text, and a spec asserting "this is visible" would pass without
 * having said why. It also matches src/hooks/permissions, where an absent or
 * unknown capability reads as denied.
 *
 * A spec grants exactly what it exercises -- `buildUserCapabilities({ canRead:
 * true })` -- so the grant appears in the test that depends on it.
 *
 * Each default lists every field instead of being derived, so a capability
 * added to the backend fails to compile here. This file is where that should be
 * noticed, and fixing it once covers every spec that builds a response.
 */

export function buildUserCapabilities(
  overrides: Partial<UserCapabilitiesResponse> = {},
): UserCapabilitiesResponse {
  return {
    canRead: false,
    canDelete: false,
    canEnable: false,
    canDisable: false,
    canRevokePlatformAdmin: false,
    canListSupplies: false,
    ...overrides,
  };
}

export function buildPlatformCapabilities(
  overrides: Partial<PlatformCapabilitiesResponse> = {},
): PlatformCapabilitiesResponse {
  return {
    canCreateCommunity: false,
    canListUsers: false,
    canAdministerPlatform: false,
    canListPlatformAdmins: false,
    canInvitePlatformAdmins: false,
    canSyncPrices: false,
    ...overrides,
  };
}

/**
 * Platform capabilities as a backend that predates one of them sends them:
 * without that key at all. The cast is the point -- the generated type says
 * the key is always there, and an older backend is exactly what breaks that.
 */
export function buildPlatformCapabilitiesWithout(
  missing: keyof PlatformCapabilitiesResponse,
  overrides: Partial<PlatformCapabilitiesResponse> = {},
): PlatformCapabilitiesResponse {
  const capabilities: Partial<PlatformCapabilitiesResponse> = buildPlatformCapabilities(overrides);
  delete capabilities[missing];
  return capabilities as PlatformCapabilitiesResponse;
}

export function buildPlatformAdminCapabilities(
  overrides: Partial<PlatformAdminCapabilitiesResponse> = {},
): PlatformAdminCapabilitiesResponse {
  return {
    canRevoke: false,
    canResendInvitation: false,
    canRevokeInvitation: false,
    ...overrides,
  };
}

export function buildCommunityCapabilities(
  overrides: Partial<CommunityCapabilitiesResponse> = {},
): CommunityCapabilitiesResponse {
  return {
    canRead: false,
    canUpdate: false,
    canEnable: false,
    canDisable: false,
    canManage: false,
    canManageMemberships: false,
    canManageMembershipInvestment: false,
    canRegisterMembers: false,
    canInviteMembers: false,
    canManageAdmins: false,
    canListPlants: false,
    canCreatePlants: false,
    canReadProduction: false,
    canListSupplies: false,
    ...overrides,
  };
}

export function buildSupplyCapabilities(
  overrides: Partial<SupplyCapabilitiesResponse> = {},
): SupplyCapabilitiesResponse {
  return {
    canRead: false,
    canEdit: false,
    canDelete: false,
    canReadPartitionCoefficients: false,
    canCreatePlant: false,
    ...overrides,
  };
}

export function buildPlantCapabilities(
  overrides: Partial<PlantCapabilitiesResponse> = {},
): PlantCapabilitiesResponse {
  return {
    canRead: false,
    canManage: false,
    canListSharingAgreements: false,
    canManageSharingAgreements: false,
    canReadSupply: false,
    ...overrides,
  };
}

export function buildMembershipCapabilities(
  overrides: Partial<MembershipCapabilitiesResponse> = {},
): MembershipCapabilitiesResponse {
  return {
    canUpdateRole: false,
    canDelete: false,
    canManageInvestment: false,
    canReadPayback: false,
    canInvite: false,
    canEnable: false,
    canDisable: false,
    canEditRecord: false,
    canListSupplies: false,
    ...overrides,
  };
}

/**
 * What a coefficient period lets the caller reach. Its `sharingAgreement` is a
 * reference and references carry no capabilities, so the period is where the
 * answer lives.
 */
export function buildPartitionCoefficientCapabilities(
  overrides: Partial<PartitionCoefficientCapabilitiesResponse> = {},
): PartitionCoefficientCapabilitiesResponse {
  return {
    canReadSharingAgreement: false,
    ...overrides,
  };
}

export function buildSharingAgreementCapabilities(
  overrides: Partial<SharingAgreementCapabilitiesResponse> = {},
): SharingAgreementCapabilitiesResponse {
  return {
    canRead: false,
    canManage: false,
    ...overrides,
  };
}

export function buildUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    ...({
      id: "TEST-USER-ID",
      personalId: "TEST-PERSONAL-ID",
      number: 90001,
      fullName: "TEST-FULL-NAME",
      address: null,
      email: "test-user@fixture.invalid",
      phoneNumber: null,
      enabled: true,
      memberships: {},
      isPlatformAdmin: false,
      capabilities: buildUserCapabilities(),
    } satisfies UserResponse),
    ...overrides,
  };
}

/**
 * The logged-in caller, as GET /users/current now answers: a user plus what
 * they may do with their own record and on the platform. Distinct from
 * buildUser, which is any user a caller can read -- only the current user
 * carries `platformCapabilities`.
 */
export function buildCurrentUser(overrides: Partial<CurrentUserResponse> = {}): CurrentUserResponse {
  return {
    ...({
      ...buildUser(),
      mustChangePassword: false,
      platformCapabilities: buildPlatformCapabilities(),
    } satisfies CurrentUserResponse),
    ...overrides,
  };
}

/**
 * The supply as a plant refers to it: id, code and name only. Listing plants is
 * open to any member, but the supply behind one is not, so the reference
 * carries no owner -- `plant.capabilities.canReadSupply` says whether following
 * it would succeed.
 */
export function buildSupplyReference(
  overrides: Partial<SupplyReferenceResponse> = {},
): SupplyReferenceResponse {
  return {
    ...({
      id: "TEST-SUPPLY-ID",
      code: "TEST-SUPPLY-CODE",
      name: null,
    } satisfies SupplyReferenceResponse),
    ...overrides,
  };
}

export function buildMembership(overrides: Partial<MembershipResponse> = {}): MembershipResponse {
  return {
    ...({
      id: "TEST-MEMBERSHIP-ID",
      user: { id: "TEST-USER-ID" },
      communityId: "TEST-COMMUNITY-ID",
      role: "COMMUNITY_MEMBER",
      // The community's member record, under its own names (lucoenergia/conluz#448).
      personalId: "TEST-PERSONAL-ID",
      fullName: "TEST-FULL-NAME",
      memberNumber: 90001,
      contactEmail: "test-user@fixture.invalid",
      address: null,
      phoneNumber: null,
      enabled: true,
      // Accepted: a pending membership (null) grants no access, so it is opt-in.
      acceptedAt: "2026-01-01T00:00:00Z",
      invitedAt: null,
      invitationExpiresAt: null,
      // Not the last active admin: a member never is (lucoenergia/conluz#449).
      lastActiveAdmin: false,
      capabilities: buildMembershipCapabilities(),
    } satisfies MembershipResponse),
    ...overrides,
  };
}

/**
 * A member as the membership writes answer it (registration, invitations): the
 * membership and the community's record on it. Pending, never invited and
 * without contact details by default, as a fresh registration is.
 */
export function buildMember(overrides: Partial<MemberResponse> = {}): MemberResponse {
  return {
    ...({
      id: "TEST-MEMBERSHIP-ID",
      user: { id: "TEST-USER-ID" },
      community: { id: "TEST-COMMUNITY-ID", name: "TEST-COMMUNITY-NAME" },
      role: "COMMUNITY_MEMBER",
      personalId: "TEST-PERSONAL-ID",
      fullName: "TEST-MEMBER-NAME",
      memberNumber: null,
      contactEmail: null,
      address: null,
      phoneNumber: null,
      acceptedAt: null,
      enabled: true,
      invitedAt: null,
      invitationExpiresAt: null,
      capabilities: buildMembershipCapabilities(),
    } satisfies MemberResponse),
    ...overrides,
  };
}

/** A community admin as GET …/admins lists them (#276): pending and never invited by default. */
export function buildCommunityAdmin(overrides: Partial<CommunityAdminResponse> = {}): CommunityAdminResponse {
  return {
    ...({
      user: { id: "TEST-USER-ID" },
      personalId: "TEST-PERSONAL-ID",
      fullName: "TEST-ADMIN-NAME",
      contactEmail: null,
      phoneNumber: null,
      acceptedAt: null,
      enabled: true,
      invitedAt: null,
      invitationExpiresAt: null,
    } satisfies CommunityAdminResponse),
    ...overrides,
  };
}

/**
 * A platform admin as GET /platform-admins lists them (#285): enabled, with no
 * email, and not revocable by default -- `revocable` is a state that would
 * enable a control, so it starts at least privilege like a capability.
 */
export function buildPlatformAdmin(overrides: Partial<PlatformAdminResponse> = {}): PlatformAdminResponse {
  return {
    ...({
      user: { id: "TEST-USER-ID" },
      fullName: "TEST-PLATFORM-ADMIN-NAME",
      email: null,
      enabled: true,
      revocable: false,
      invitation: null,
      capabilities: buildPlatformAdminCapabilities(),
    } satisfies PlatformAdminResponse),
    ...overrides,
  };
}

/**
 * A pending invitation to the platform-admin role as GET /platform-admins
 * lists it (#288): the name and email the inviter typed, `enabled` and
 * `revocable` null because the row tells nothing about the account, and a
 * link that can still be used.
 */
export function buildPlatformAdminInvitation(overrides: Partial<PlatformAdminResponse> = {}): PlatformAdminResponse {
  return buildPlatformAdmin({
    fullName: "TEST-INVITED-PLATFORM-ADMIN-NAME",
    email: "TEST-INVITED@example.test",
    enabled: null,
    revocable: null,
    invitation: { invitedAt: "2026-01-02T09:00:00Z", expiresAt: "2026-01-09T09:00:00Z" },
    ...overrides,
  });
}

export function buildCommunity(overrides: Partial<CommunityResponse> = {}): CommunityResponse {
  return {
    ...({
      id: "TEST-COMMUNITY-ID",
      name: "TEST-COMMUNITY-NAME",
      code: "TEST-CODE",
      legalId: null,
      address: null,
      enabled: true,
      adminNames: ["TEST-ADMIN-NAME"],
      memberCount: 90002,
      supplyPointCount: 90003,
      capabilities: buildCommunityCapabilities(),
    } satisfies CommunityResponse),
    ...overrides,
  };
}

/**
 * A member's record in one community, as a supply carries its owner's
 * (`SupplyResponse.ownerRecord`, lucoenergia/conluz#448).
 */
export function buildMemberRecord(overrides: Partial<MemberRecordResponse> = {}): MemberRecordResponse {
  return {
    ...({
      fullName: "TEST-FULL-NAME",
      memberNumber: 90001,
      contactEmail: "test-user@fixture.invalid",
      address: null,
      phoneNumber: null,
    } satisfies MemberRecordResponse),
    ...overrides,
  };
}

export function buildSupply(overrides: Partial<SupplyResponse> = {}): SupplyResponse {
  return {
    ...({
      id: "TEST-SUPPLY-ID",
      code: "TEST-SUPPLY-CODE",
      // No owner, so no owner record either: a spec grants both when it needs them.
      user: null,
      ownerRecord: null,
      name: null,
      address: "TEST-SUPPLY-ADDRESS",
      addressRef: null,
      enabled: true,
      contract: null,
      distributor: null,
      shelly: null,
      // No plant's own supply: a spec describing one sets the plant.
      plant: null,
      // The same community buildPlant and renderWithProviders use, so a supply
      // and the active community agree by default and a spec only has to
      // override this when the point of the test is that they do not.
      community: { id: "TEST-COMMUNITY-ID", name: "TEST-COMMUNITY-NAME" },
      capabilities: buildSupplyCapabilities(),
    } satisfies SupplyResponse),
    ...overrides,
  };
}

export function buildPlant(overrides: Partial<PlantResponse> = {}): PlantResponse {
  return {
    ...({
      id: "TEST-PLANT-ID",
      providerCode: "TEST-PROVIDER-CODE",
      regulatoryCode: null,
      supply: buildSupplyReference(),
      name: "TEST-PLANT-NAME",
      address: "TEST-PLANT-ADDRESS",
      description: null,
      inverterProvider: PlantResponseInverterProvider.HUAWEI,
      totalPower: 90004,
      connectionDate: null,
      community: { id: "TEST-COMMUNITY-ID" },
      capabilities: buildPlantCapabilities(),
    } satisfies PlantResponse),
    ...overrides,
  };
}

export function buildSharingAgreement(overrides: Partial<SharingAgreementResponse> = {}): SharingAgreementResponse {
  return {
    ...({
      id: "TEST-AGREEMENT-ID",
      plantId: "TEST-PLANT-ID",
      name: "TEST-AGREEMENT-NAME",
      notes: null,
      status: SharingAgreementResponseStatus.DRAFT,
      installedPowerKw: 90005,
      createdAt: "2001-01-01T00:00:00Z",
      createdBy: null,
      updatedAt: null,
      updatedBy: null,
      file: null,
      capabilities: buildSharingAgreementCapabilities(),
    } satisfies SharingAgreementResponse),
    ...overrides,
  };
}

export function buildCoefficient(
  overrides: Partial<SharingAgreementPartitionCoefficientResponse> = {},
): SharingAgreementPartitionCoefficientResponse {
  return {
    ...({
      coefficientId: "TEST-COEFFICIENT-ID",
      supply: { id: "TEST-SUPPLY-ID", code: "TEST-SUPPLY-CODE", name: null },
      // Not zero, and not a round share, so an unintended default stands out.
      coefficient: 0.090001,
      validFrom: null,
      validTo: null,
      applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
      endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN,
      endDate: null,
      currentCoefficient: null,
    } satisfies SharingAgreementPartitionCoefficientResponse),
    ...overrides,
  };
}

/**
 * A coefficient currently in force in a plant, as the plant's active
 * coefficients endpoint returns it. Unlike the other builders this one does
 * not start at the beginning of the lifecycle, because "in force" is the only
 * state that endpoint returns: `validFrom` is set, `validTo` is open, and the
 * authoring agreement is PUBLISHED. A SUPERSEDED agreement never holds an
 * open coefficient, so a fixture must not pair one with an in-force row.
 */
export function buildActiveCoefficient(overrides: Partial<PartitionCoefficientResponse> = {}): PartitionCoefficientResponse {
  return {
    ...({
      id: "TEST-ACTIVE-COEFFICIENT-ID",
      supply: { id: "TEST-SUPPLY-ID", code: "TEST-SUPPLY-CODE", name: null },
      community: { id: "TEST-COMMUNITY-ID", name: "TEST-COMMUNITY-NAME" },
      plant: { id: "TEST-PLANT-ID", name: "TEST-PLANT-NAME" },
      sharingAgreement: {
        id: "TEST-IN-FORCE-AGREEMENT-ID",
        name: "TEST-IN-FORCE-AGREEMENT-NAME",
        status: SharingAgreementReferenceResponseStatus.PUBLISHED,
      },
      // Not zero, and not a round share, so an unintended default stands out.
      coefficient: 0.070001,
      validFrom: "2001-01-01",
      validTo: null,
      createdAt: "2001-01-01T00:00:00Z",
      // Required on the response since the capability epic, and withheld by
      // default like every other capability builder: a spec grants what it
      // exercises.
      capabilities: buildPartitionCoefficientCapabilities(),
    } satisfies PartitionCoefficientResponse),
    ...overrides,
  };
}

/**
 * A membership's aggregated energy metrics. The default is the shape the
 * backend answers when no period resolves -- no month with assigned
 * production yet: null bounds, zero totals, null ratios and a null amount.
 * It is the only shape that is valid without saying which month it is, as a
 * DRAFT agreement is the only valid agreement on its own. A spec describing a
 * resolved month sets the period, the totals and the ratios it asserts on.
 */
export function buildMembershipEnergyMetrics(
  overrides: Partial<MembershipEnergyMetricsResponse> = {},
): MembershipEnergyMetricsResponse {
  return {
    ...({
      period: { startDate: null, endDate: null },
      coverage: { hoursWithData: 0, expectedHours: 0, supplyCount: 1, suppliesWithData: 0 },
      energy: {
        totalConsumptionKWh: 0,
        gridImportKWh: 0,
        selfConsumptionKWh: 0,
        surplusKWh: 0,
        assignedProductionKWh: 0,
      },
      // ESTIMATE even here, where nothing was priced: the backend reports it
      // whenever no contracted tariff was consulted.
      savings: { amountEur: null, tariffSource: "ESTIMATE", estimatedPrice: null },
      selfSufficiencyRatio: null,
      selfConsumptionRatio: null,
      selfConsumptionRatioStatus: "NOTHING_ASSIGNED",
      selfConsumptionRatioBasis: { selfConsumptionKWh: 0, assignedProductionKWh: 0, excludedPlantSupplyCount: 0 },
    } satisfies MembershipEnergyMetricsResponse),
    ...overrides,
  };
}

/**
 * One month of a membership's monthly series. The default is a month with
 * nothing stored, as the backend answers it: zero energy, null savings and a
 * null tariff source, no supply reporting. A spec describing a stored month
 * sets the energy, the savings and the counters it asserts on.
 */
export function buildMembershipMonthlyConsumptionBucket(
  overrides: Partial<MembershipMonthlyConsumptionBucketResponse> = {},
): MembershipMonthlyConsumptionBucketResponse {
  return {
    date: "2026/01/01",
    time: "00:00",
    gridImportKWh: 0,
    surplusKWh: 0,
    assignedProductionKWh: 0,
    selfConsumptionKWh: 0,
    savingsEur: null,
    tariffSource: null,
    supplyCount: 1,
    suppliesWithData: 0,
    ...overrides,
  };
}

/**
 * One hour of a membership's hourly profile. The default is an hour without a
 * sample in either series: null averages and zero counts.
 */
export function buildMembershipHourlyProfileBucket(
  overrides: Partial<MembershipHourlyProfileBucketResponse> = {},
): MembershipHourlyProfileBucketResponse {
  return {
    hour: 0,
    averageTotalConsumptionKWh: null,
    totalConsumptionSampleCount: 0,
    averageAssignedProductionKWh: null,
    assignedProductionSampleCount: 0,
    ...overrides,
  };
}

/**
 * A membership's hourly profile. The default is the shape the backend answers
 * when no month resolves: null bounds, no coverage, and the 24 hours without a
 * sample.
 */
export function buildMembershipHourlyProfile(
  overrides: Partial<MembershipHourlyProfileResponse> = {},
): MembershipHourlyProfileResponse {
  return {
    period: { startDate: null, endDate: null },
    coverage: { hoursWithData: 0, expectedHours: 0, supplyCount: 1, suppliesWithData: 0 },
    buckets: Array.from({ length: 24 }, (_, hour) => buildMembershipHourlyProfileBucket({ hour })),
    ...overrides,
  };
}

/**
 * A membership's payback progress. The default is the community that has
 * never shared energy and the member with no investment recorded: every
 * amount null and `tariffSource` ESTIMATE, as the backend answers it.
 */
export function buildMembershipPayback(overrides: Partial<MembershipPaybackResponse> = {}): MembershipPaybackResponse {
  return {
    ...({
      investmentEur: null,
      savedEur: null,
      remainingEur: null,
      progressRatio: null,
      startDate: null,
      estimatedRemainingMonths: null,
      tariffSource: "ESTIMATE",
      estimatedPrice: null,
    } satisfies MembershipPaybackResponse),
    ...overrides,
  };
}

/** One of a community's contact channels. Schedule and notes are null unless a spec sets them. */
export function buildContactChannel(overrides: Partial<ContactChannelResponse> = {}): ContactChannelResponse {
  return {
    ...({
      type: "EMAIL",
      label: "TEST-CHANNEL-LABEL",
      value: "test-channel@conluz.test",
      schedule: null,
      notes: null,
    } satisfies ContactChannelResponse),
    ...overrides,
  };
}

/** The instance operator's contact. Phone, schedule and notes are null unless a spec sets them. */
export function buildOperatorContact(overrides: Partial<OperatorContactResponse> = {}): OperatorContactResponse {
  return {
    ...({
      name: "TEST-OPERATOR-NAME",
      email: "test-operator@conluz.test",
      phone: null,
      schedule: null,
      notes: null,
    } satisfies OperatorContactResponse),
    ...overrides,
  };
}
