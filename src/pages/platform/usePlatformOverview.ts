import { useGetAllCommunities } from "../../api/communities/communities";
import { useGetAllUsers } from "../../api/users/users";
import type { CommunityResponse } from "../../api/models";
import type { CommunityStatus } from "../../components/CommunityStatusChip";

/**
 * Derive a single community's status.
 * Precedence: disabled → no members → no admins → active.
 */
export function deriveStatus(community: CommunityResponse): CommunityStatus {
  if (community.enabled === false) return "Deshabilitada";
  if ((community.memberCount ?? 0) === 0) return "Sin usuarios";
  if (!community.adminNames || community.adminNames.length === 0) return "Sin admin";
  return "Activa";
}

export interface PlatformKpis {
  /** Total number of communities. */
  communities: number;
  /** Communities whose memberCount > 0. */
  communitiesWithUsers: number;
  /** Communities whose memberCount is 0 (or missing). */
  communitiesWithoutUsers: number;
  /** Σ supplyPointCount across all communities. */
  supplyPoints: number;
  /** Σ memberCount across all communities (memberships, not distinct people). */
  members: number;
}

export interface AttentionCounts {
  /** Communities with no administrators. */
  withoutAdmin: number;
  /** Communities with no members. */
  withoutUsers: number;
  /** Communities with enabled === false. */
  disabled: number;
}

/**
 * Pure reducer over the community list. Counts are independent — a single
 * community may contribute to several attention signals at once.
 */
export function computeOverview(communities: CommunityResponse[]): {
  kpis: PlatformKpis;
  attention: AttentionCounts;
} {
  let communitiesWithUsers = 0;
  let supplyPoints = 0;
  let members = 0;
  let withoutAdmin = 0;
  let withoutUsers = 0;
  let disabled = 0;

  for (const community of communities) {
    const memberCount = community.memberCount ?? 0;

    if (memberCount > 0) communitiesWithUsers += 1;
    else withoutUsers += 1;

    supplyPoints += community.supplyPointCount ?? 0;
    members += memberCount;

    if (!community.adminNames || community.adminNames.length === 0) withoutAdmin += 1;
    if (community.enabled === false) disabled += 1;
  }

  return {
    kpis: {
      communities: communities.length,
      communitiesWithUsers,
      communitiesWithoutUsers: withoutUsers,
      supplyPoints,
      members,
    },
    attention: { withoutAdmin, withoutUsers, disabled },
  };
}

export interface PlatformOverview {
  kpis: PlatformKpis;
  attention: AttentionCounts;
  /** Full community list (unfiltered — used by the preview and status column). */
  communities: CommunityResponse[];
  /** Distinct people = totalElements from GET /api/v1/users. */
  usersCount: number;
  /** True when the users count could not be fetched (e.g. 403) — hide the Usuarios KPI. */
  usersCountUnavailable: boolean;
  /** Page-level loading, driven by the communities request. */
  isLoading: boolean;
  /** Page-level error, driven by the communities request. */
  error: unknown;
}

/**
 * Composes the two existing fetches (communities + a size-1 users page) into the
 * derived KPIs, attention counts and community list the dashboard renders.
 * No extra API calls are made.
 */
export function usePlatformOverview(): PlatformOverview {
  const communitiesQuery = useGetAllCommunities();
  // size: 1 — we only read totalElements, never the full user list.
  const usersQuery = useGetAllUsers({ size: 1 });

  const communities = communitiesQuery.data ?? [];
  const { kpis, attention } = computeOverview(communities);

  return {
    kpis,
    attention,
    communities,
    usersCount: usersQuery.data?.totalElements ?? 0,
    usersCountUnavailable: usersQuery.isError,
    isLoading: communitiesQuery.isLoading,
    error: communitiesQuery.error,
  };
}
