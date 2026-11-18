import type { PlantResponse } from "../../../api/models";
import { useGetPlantSharingObservation } from "../../../api/sharing-agreements/sharing-agreements";
import { usePlantInActiveCommunity } from "../usePlantInActiveCommunity";
import { isNotFoundError } from "../useSharingAgreementsData";
import type { PlantSharingObservation } from "./pendingObservationFields";

/**
 * The analysis is computed on every request and is expensive, while what it
 * reads changes once a month at most: a result is reused for ten minutes, and,
 * as every query in the app, it is not refetched on window focus (#418).
 */
export const OBSERVATION_STALE_TIME = 10 * 60 * 1000;

export interface PlantSharingObservationData {
  plant: PlantResponse | undefined;
  observation: PlantSharingObservation | undefined;
  isLoading: boolean;
  /** A plant that does not exist, or belongs to another community. */
  isNotFound: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * The plant's observed sharing, behind the active-community guard. The
 * analysis is asked for only once the plant is known to belong to the active
 * community, so a foreign plant id from the URL never triggers it.
 */
export function usePlantSharingObservationData(plantId: string): PlantSharingObservationData {
  const plantRead = usePlantInActiveCommunity(plantId);
  const { plant } = plantRead;
  const observationRead = useGetPlantSharingObservation(plantId, {
    query: { enabled: plant !== undefined, staleTime: OBSERVATION_STALE_TIME },
  });

  // The regenerated client's response is the placeholder type (conluz#597).
  const observation: PlantSharingObservation | undefined = observationRead.data;
  const isNotFound = plantRead.isNotFound || isNotFoundError(observationRead.error);
  return {
    plant,
    observation,
    isLoading: plantRead.isLoading || (plant !== undefined && observationRead.isLoading),
    isNotFound,
    error: isNotFound ? null : (plantRead.error ?? observationRead.error),
    refetch: () => {
      if (plantRead.error) plantRead.refetch();
      if (observationRead.error) void observationRead.refetch();
    },
  };
}
