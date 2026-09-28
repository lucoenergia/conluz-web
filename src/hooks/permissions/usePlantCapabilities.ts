import type { PlantCapabilitiesResponse } from "../../api/models";
import { usePlantInActiveCommunity } from "../../pages/production/usePlantInActiveCommunity";
import { DENIED, PENDING, isDenial, decide, type CapabilityOutcome } from "./capabilityOutcome";

/**
 * What the caller may do with one plant.
 *
 * Reached through usePlantInActiveCommunity rather than the generated hook, so
 * the active-community guard applies: a plant belonging to another community is
 * withheld, and withheld has to read as a denial rather than a wait, or a deep
 * link into somebody else's community would hang instead of redirecting.
 *
 * The request is the same one the page behind the guard makes, so React Query
 * serves both from one fetch.
 *
 * `enabled` exists for callers that ask conditionally -- a route guard resolves
 * every scope on every render to keep the hook order stable, and must not fire
 * a plant request on a route that has no plant.
 */
export function usePlantCapabilities(
  plantId: string | undefined,
  capability: keyof PlantCapabilitiesResponse,
  { enabled = true }: { enabled?: boolean } = {},
): CapabilityOutcome {
  const { plant, isLoading, isNotFound, error, refetch } = usePlantInActiveCommunity(
    enabled && plantId ? plantId : "",
  );

  if (!enabled || !plantId) return DENIED;

  // Missing, or belonging to a community the caller is not working in. The
  // wrapper has already folded both into one answer: no.
  if (isNotFound) return DENIED;

  if (error) {
    return isDenial(error) ? DENIED : { state: "error", error, retry: refetch };
  }
  if (isLoading || plant === undefined) return PENDING;

  return decide(plant.capabilities, capability);
}
