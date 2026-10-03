import { vi } from "vitest";
import { useGetCommunityById, type getCommunityById } from "../../api/communities/communities";
import { CommunityRole, type CurrentUserResponse, type SupplyResponse } from "../../api/models";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser, buildSupply, buildUser } from "../../test/fixtures";
import { query } from "../../test/queryState";

/**
 * The callers and communities the home-view specs share (#197). A spec using
 * these mocks `api/communities/communities` in its own file.
 *
 * The ownership read is answered in each spec instead: this module is not a
 * spec, so naming the user-scoped listing here would make it a call site in
 * the eyes of src/contracts/userScopedReads.spec.ts.
 */

export const USER_ID = "home-user";
export const COMMUNITY_A = "community-a";
export const COMMUNITY_B = "community-b";

export function currentUser(memberships: Record<string, CommunityRole>): CurrentUserResponse {
  return buildCurrentUser({ id: USER_ID, memberships });
}

/** Answers every community as one the caller may read, and manages only those in `adminOf`. */
export function answerCommunities({ adminOf }: { adminOf: string[] }): void {
  vi.mocked(useGetCommunityById).mockImplementation((communityId) =>
    query.success<typeof getCommunityById>(
      buildCommunity({
        id: communityId,
        capabilities: buildCommunityCapabilities({
          canRead: true,
          canManage: adminOf.includes(communityId),
        }),
      }),
    ),
  );
}

export function communitiesPending(): void {
  vi.mocked(useGetCommunityById).mockReturnValue(query.loading());
}

/** A supply the caller owns in `communityId`. */
export function ownSupply(communityId: string): SupplyResponse {
  return buildSupply({
    id: `supply-in-${communityId}`,
    user: buildUser({ id: USER_ID }),
    community: { id: communityId, name: `Name of ${communityId}` },
  });
}
