import type { SupplyResponse } from "../../api/models";

/**
 * Whether a supply belongs to a community other than the one currently selected.
 *
 * The twin of isPlantOutsideActiveCommunity, and it exists for the same reason:
 * GET /supplies/{supplyId} is authorised by membership, not by whichever
 * community happens to be active in this tab -- so a supply from another of the
 * user's communities opens perfectly well from a bookmark, a pasted URL, or a
 * reload. Nothing is leaking: the backend has already decided the user may see
 * it. What this prevents is the screen presenting it as if it belonged to the
 * community named in the selector, and offering actions scoped to the wrong one.
 *
 * A switch performed in the app is handled earlier, by the redirect in
 * AuthenticatedLayout. This covers the case where no switch happens at all.
 *
 * Unresolved on either side is "don't know yet", never "foreign": a supply still
 * loading, or a community not yet restored from storage, would otherwise flash
 * "not found" on every single load. Only an id that is present on both sides and
 * differs counts.
 */
export function isSupplyOutsideActiveCommunity(
  supply: SupplyResponse | undefined,
  activeCommunityId: string | null | undefined,
): boolean {
  if (!supply?.community?.id || !activeCommunityId) return false;
  return supply.community.id !== activeCommunityId;
}
