import type { CommunityResponse, MembershipResponse, RestErrorDetailCode } from "../../api/models";
import { routeRequests, type RequestConfig, type RequestRouter } from "../../test/requestRouter";
import {
  buildCommunity,
  buildCommunityCapabilities,
  buildCurrentUser,
  buildMembership,
  buildMembershipCapabilities,
  buildUser,
} from "../../test/fixtures";

/**
 * The members page served over routed requests, for the tier-2 specs of
 * registration and invitations (#275). Mock-free: each spec mocks
 * custom-instance itself and hands `serveMembersPage` its mock.
 *
 * The routes cover what the page reads and the writes #275 sends, and nothing
 * else: a GET of the user list or a POST that links an existing account
 * matches no route, so it fails the test that sent it.
 */
export const COMMUNITY_ID = "community-1";
export const COMMUNITY_NAME = "Comunidad Solar";
export const COMMUNITY_URL = `/api/v1/communities/${COMMUNITY_ID}`;
export const ROSTER_URL = `${COMMUNITY_URL}/memberships`;
export const REGISTER_URL = `${ROSTER_URL}/register`;
export const BULK_INVITE_URL = `${ROSTER_URL}/invite`;
export const inviteUrl = (userId: string) => `${ROSTER_URL}/${userId}/invite`;
export const resendUrl = (userId: string) => `${ROSTER_URL}/${userId}/invitation/resend`;
export const revokeUrl = (userId: string) => `${ROSTER_URL}/${userId}/invitation/revoke`;
export const removeUrl = (userId: string) => `${ROSTER_URL}/${userId}`;

/** What the backend grants an active admin of the community. */
export const ADMIN_COMMUNITY = buildCommunity({
  id: COMMUNITY_ID,
  name: COMMUNITY_NAME,
  capabilities: buildCommunityCapabilities({
    canRead: true,
    canManageMemberships: true,
    canRegisterMembers: true,
    canInviteMembers: true,
  }),
});

const CALLER = buildCurrentUser({
  id: "admin",
  fullName: "Ada Admin",
  memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" },
});

/** What the backend grants an active admin on a member's row. */
export const ON_A_MEMBER = buildMembershipCapabilities({
  canInvite: true,
  canDelete: true,
  canEditRecord: true,
  canEnable: true,
  canDisable: true,
});

/** A member's roster row: pending and never invited unless the overrides say otherwise. */
export function rosterRow(
  userId: string,
  fullName: string,
  overrides: Partial<MembershipResponse> = {},
): MembershipResponse {
  return buildMembership({
    id: `m-${userId}`,
    communityId: COMMUNITY_ID,
    role: "COMMUNITY_MEMBER",
    enabled: true,
    acceptedAt: null,
    invitedAt: null,
    invitationExpiresAt: null,
    user: buildUser({ id: userId, fullName, email: `${userId}@example.com` }),
    capabilities: ON_A_MEMBER,
    ...overrides,
  });
}

/** What the next roster GET serves, so a write's handler can change it as the backend would. */
export type Roster = { current: MembershipResponse[] };

export type Write = "register" | "invite" | "resend" | "revoke" | "bulk" | "remove";

export type Writes = Partial<Record<Write, (config: RequestConfig) => unknown>>;

type CustomInstanceMock = { mockImplementation: (handle: RequestRouter["handle"]) => unknown };

export function serveMembersPage(
  customInstance: CustomInstanceMock,
  roster: Roster,
  writes: Writes = {},
  community: CommunityResponse = ADMIN_COMMUNITY,
): RequestRouter {
  const write = (name: Write) => (config: RequestConfig) => {
    const handler = writes[name];
    if (!handler) throw new Error(`unexpected ${name}`);
    return handler(config);
  };
  const router = routeRequests([
    { method: "GET", url: "/api/v1/users/current", respond: () => CALLER },
    { method: "GET", url: "/api/v1/communities", respond: () => [community] },
    { method: "GET", url: COMMUNITY_URL, respond: () => community },
    { method: "GET", url: ROSTER_URL, respond: () => roster.current },
    { method: "POST", url: REGISTER_URL, respond: write("register") },
    { method: "POST", url: BULK_INVITE_URL, respond: write("bulk") },
    { method: "POST", url: /\/memberships\/[^/]+\/invite$/, respond: write("invite") },
    { method: "POST", url: /\/memberships\/[^/]+\/invitation\/resend$/, respond: write("resend") },
    { method: "POST", url: /\/memberships\/[^/]+\/invitation\/revoke$/, respond: write("revoke") },
    { method: "DELETE", url: /\/memberships\/[^/]+$/, respond: write("remove") },
  ]);
  customInstance.mockImplementation(router.handle);
  return router;
}

export const requestsTo = (router: RequestRouter, method: string, url: string) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() === method && r.url === url);

export const writesSent = (router: RequestRouter) =>
  router.requests.filter((r) => (r.method ?? "GET").toUpperCase() !== "GET");

export const rosterReads = (router: RequestRouter) => requestsTo(router, "GET", ROSTER_URL).length;

/** An API refusal as Axios rejects with it: status, headers and the RestError body. */
export function restError(
  status: number,
  code: RestErrorDetailCode,
  { headers = {}, params }: { headers?: Record<string, string>; params?: Record<string, string> } = {},
) {
  return {
    response: {
      status,
      headers,
      data: { status, message: "refused", errors: [{ message: "refused", code, ...(params ? { params } : {}) }] },
    },
  };
}
