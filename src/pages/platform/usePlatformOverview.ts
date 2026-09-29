import { useGetAllCommunities } from "../../api/communities/communities";
import { useGetAllUsers } from "../../api/users/users";
import { usePlatformCapabilities } from "../../hooks/permissions";
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
  /** Whether the caller may list users at all, which is what the Usuarios KPI needs. */
  mayListUsers: boolean;
  /** Page-level loading, driven by the communities request. */
  isLoading: boolean;
  /** Page-level error, driven by the communities request. */
  error: unknown;
}

/**
 * Composes the two existing fetches (communities + a size-1 users page) into the
 * derived KPIs, attention counts and community list the dashboard renders.
 * No extra API calls are made.
 *
 * The page itself gates on `canAdministerPlatform`, which its schema doc names as
 * covering the platform overview; listing users is a separate answer, so the
 * users request is asked for only when the caller holds it. It used to be fired
 * regardless and its 403 read back off `isError` to hide the KPI -- which worked,
 * but made a refused request part of how the page decided what to show, and
 * could not tell a refusal from a network failure.
 */
export function usePlatformOverview(): PlatformOverview {
  const communitiesQuery = useGetAllCommunities();
  const mayListUsers = usePlatformCapabilities("canListUsers").state === "allowed";
  // size: 1 — we only read totalElements, never the full user list.
  const usersQuery = useGetAllUsers({ size: 1 }, { query: { enabled: mayListUsers } });

  const communities = communitiesQuery.data ?? [];
  const { kpis, attention } = computeOverview(communities);

  return {
    kpis,
    attention,
    communities,
    usersCount: usersQuery.data?.totalElements ?? 0,
    mayListUsers,
    isLoading: communitiesQuery.isLoading,
    error: communitiesQuery.error,
  };
}
