import type { CommunityResponse, MembershipResponse, UserResponse } from "../api/models";

/**
 * Typed fixture builders. Defaults satisfy the generated response types and
 * are deliberately distinctive: obviously synthetic strings, and non-zero
 * sentinels where zero is a meaningful domain value. A spec that silently
 * depends on a default then shows it in its failure output instead of passing
 * by accident, so specs override every value they assert on.
 *
 * Two kinds of field keep a plain value: nullables stay null, and fields that
 * grant access (`memberships`, `isPlatformAdmin`) stay at least privilege,
 * because a distinctive value there would change gating rather than text.
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
