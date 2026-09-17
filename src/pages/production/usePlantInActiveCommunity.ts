import { useGetPlantById } from "../../api/plants/plants";
import { useActiveCommunity } from "../../context/community.context";
import { isPlantOutsideActiveCommunity } from "./plantCommunityScope";
import type { PlantResponse } from "../../api/models";

export interface PlantInActiveCommunity {
  /** Withheld while the plant belongs to another community. */
  plant: PlantResponse | undefined;
  isLoading: boolean;
  /** True for a real 404 *and* for a plant outside the selected community. */
  isNotFound: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * useGetPlantById with the active-community guard applied.
 *
 * The raw hook is deliberately restricted to wrappers like this one (see the
 * no-restricted-imports rule in eslint.config.js): its key is a plant id from
 * the URL, so it cannot re-scope itself when the community changes, and its
 * response is authorised by membership rather than by the active community.
 * Reaching for it directly is how a page ends up rendering one community's
 * plant under another community's name.
 */
export function usePlantInActiveCommunity(plantId: string): PlantInActiveCommunity {
  const activeCommunityId = useActiveCommunity();
  const { data: plant, isLoading, error, refetch } = useGetPlantById(plantId);

  const isForeign = isPlantOutsideActiveCommunity(plant, activeCommunityId);
  const isNotFound =
    isForeign || (error as { response?: { status?: number } } | null)?.response?.status === 404;

  return {
    plant: isForeign ? undefined : plant,
    isLoading,
    isNotFound,
    error: isNotFound ? null : error,
    refetch,
  };
}
