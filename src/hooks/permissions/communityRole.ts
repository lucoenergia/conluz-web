/**
 * A user's role in one community, as the values of `memberships` on the
 * current user carry it.
 *
 * Written by hand rather than generated: the contract types those values as
 * plain strings, so the client has no enum for them. Like every role, it is
 * read to decide something only inside this module (a lint rule enforces it);
 * elsewhere it is data -- a fixture, or a value to pass along.
 */
export const CommunityRole = {
  COMMUNITY_MEMBER: "COMMUNITY_MEMBER",
  COMMUNITY_ADMIN: "COMMUNITY_ADMIN",
} as const;

export type CommunityRole = (typeof CommunityRole)[keyof typeof CommunityRole];
