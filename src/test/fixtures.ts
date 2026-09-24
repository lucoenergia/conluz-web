import type { CommunityResponse, MembershipResponse, UserResponse } from "../api/models";

/**
 * Typed fixture builders. Defaults satisfy the generated response types and
 * stay visually neutral (nullable fields null, counts zero) so they do not add
 * text a spec might match by accident. Specs override what they assert on.
 */

export function buildUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    ...({
      id: "user-1",
      personalId: "",
      number: 0,
      fullName: "Test User",
      address: null,
      email: "user@example.com",
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
      id: "membership-1",
      user: buildUser(),
      communityId: "community-1",
      role: "COMMUNITY_MEMBER",
      enabled: true,
    } satisfies MembershipResponse),
    ...overrides,
  };
}

export function buildCommunity(overrides: Partial<CommunityResponse> = {}): CommunityResponse {
  return {
    ...({
      id: "community-1",
      name: "Test Community",
      code: "TST",
      legalId: null,
      address: null,
      enabled: true,
      adminNames: [],
      memberCount: 0,
      supplyPointCount: 0,
    } satisfies CommunityResponse),
    ...overrides,
  };
}
