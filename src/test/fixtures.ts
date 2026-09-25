import {
  PlantResponseInverterProvider,
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
  type CommunityResponse,
  type MembershipResponse,
  type PlantResponse,
  type SharingAgreementPartitionCoefficientResponse,
  type SharingAgreementResponse,
  type SupplyResponse,
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
    } satisfies UserResponse),
    ...overrides,
  };
}

export function buildMembership(overrides: Partial<MembershipResponse> = {}): MembershipResponse {
  return {
    ...({
      id: "TEST-MEMBERSHIP-ID",
      user: buildUser(),
      communityId: "TEST-COMMUNITY-ID",
      role: "COMMUNITY_MEMBER",
      enabled: true,
    } satisfies MembershipResponse),
    ...overrides,
  };
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
    } satisfies CommunityResponse),
    ...overrides,
  };
}

export function buildSupply(overrides: Partial<SupplyResponse> = {}): SupplyResponse {
  return {
    ...({
      id: "TEST-SUPPLY-ID",
      code: "TEST-SUPPLY-CODE",
      user: null,
      name: null,
      address: "TEST-SUPPLY-ADDRESS",
      addressRef: null,
      enabled: true,
      contract: null,
      distributor: null,
      shelly: null,
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
      supply: buildSupply(),
      name: "TEST-PLANT-NAME",
      address: "TEST-PLANT-ADDRESS",
      description: null,
      inverterProvider: PlantResponseInverterProvider.HUAWEI,
      totalPower: 90004,
      connectionDate: null,
      community: { id: "TEST-COMMUNITY-ID" },
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
