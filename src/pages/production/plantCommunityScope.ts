import type { PlantResponse } from "../../api/models";

/**
 * Whether a plant belongs to a community other than the one currently selected.
 *
 * GET /plants/{plantId} is authorised by membership, not by whichever community
 * happens to be active in this tab -- so a plant from another of the user's
 * communities opens perfectly well from a bookmark, a pasted URL, or a reload.
 * Nothing is leaking: the backend has already decided the user may see it. What
 * this prevents is the screen presenting it as if it belonged to the community
 * named in the selector, and offering actions scoped to the wrong one.
 *
 * A switch performed in the app is handled earlier, by the redirect in
 * AuthenticatedLayout. This covers the case where no switch happens at all.
 *
 * Unresolved on either side is "don't know yet", never "foreign": a plant still
 * loading, or a community not yet restored from storage, would otherwise flash
 * "not found" on every single load. Only an id that is present on both sides and
 * differs counts.
 */
export function isPlantOutsideActiveCommunity(
  plant: PlantResponse | undefined,
  activeCommunityId: string | null | undefined,
): boolean {
  if (!plant?.community?.id || !activeCommunityId) return false;
  return plant.community.id !== activeCommunityId;
}
