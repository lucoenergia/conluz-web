import { MembershipResponseRole, type MembershipResponse } from "../../api/models";
import { normalizeForSearch, normalizePersonalId } from "../../utils/search";
import { membershipStatusOf, type MembershipStatus, type PendingStatus } from "./membershipStatus";

/** "pending" matches every pending sub-status; a sub-status matches only itself. */
export type StatusFilter = "all" | MembershipStatus | PendingStatus;

export type RoleFilter = "all" | MembershipResponseRole;

export interface MemberFilters {
  query: string;
  status: StatusFilter;
  role: RoleFilter;
}

export const NO_MEMBER_FILTERS: MemberFilters = { query: "", status: "all", role: "all" };

/** "0 miembros", "1 miembro", "N miembros". */
export const membersCount = (count: number) => (count === 1 ? "1 miembro" : `${count} miembros`);

/** The rows of one page of the members list (#331). */
export const MEMBERS_PAGE_SIZE = 25;

type SearchedFields = Pick<MembershipResponse, "fullName" | "personalId" | "contactEmail">;

/**
 * Whether the row matches the search: a substring of the name or the contact
 * email, ignoring case and accents, or of the DNI/NIE/NIF once the query is
 * written the way it is stored. A blank query matches every row.
 */
export function matchesSearch(membership: SearchedFields, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const text = normalizeForSearch(trimmed);
  if (normalizeForSearch(membership.fullName).includes(text)) return true;
  if (membership.contactEmail !== null && normalizeForSearch(membership.contactEmail).includes(text)) return true;
  // A query of only dots or hyphens is empty once normalised, and would match every DNI.
  const personalId = normalizePersonalId(trimmed);
  return personalId !== "" && normalizePersonalId(membership.personalId).includes(personalId);
}

export function matchesStatus(membership: Parameters<typeof membershipStatusOf>[0], filter: StatusFilter): boolean {
  if (filter === "all") return true;
  const { status, pending } = membershipStatusOf(membership);
  return filter === status || filter === pending;
}

export function matchesRole(membership: Pick<MembershipResponse, "role">, filter: RoleFilter): boolean {
  return filter === "all" || membership.role === filter;
}

/** The rows matching the search, the status and the role together, in their order. */
export function filterMemberships(memberships: MembershipResponse[], filters: MemberFilters): MembershipResponse[] {
  return memberships.filter(
    (membership) =>
      matchesSearch(membership, filters.query) &&
      matchesStatus(membership, filters.status) &&
      matchesRole(membership, filters.role),
  );
}

/** How many pages `count` rows fill; one when there are none. */
export function pageCountOf(count: number): number {
  return Math.max(1, Math.ceil(count / MEMBERS_PAGE_SIZE));
}

/** The rows of a 1-based page, clamped to the last one. */
export function pageOf<T>(rows: T[], page: number): T[] {
  const current = Math.min(Math.max(1, page), pageCountOf(rows.length));
  return rows.slice((current - 1) * MEMBERS_PAGE_SIZE, current * MEMBERS_PAGE_SIZE);
}
