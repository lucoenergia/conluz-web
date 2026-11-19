import type { PlantResponse, SharingAgreementObservationResponse } from "../../../api/models";
import { useGetSharingAgreementObservation } from "../../../api/sharing-agreements/sharing-agreements";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../../errors/apiErrorCatalogue";
import { usePlantInActiveCommunity } from "../usePlantInActiveCommunity";
import { isNotFoundError } from "../useSharingAgreementsData";
import { OBSERVATION_STALE_TIME } from "./usePlantSharingObservationData";

export interface SharingAgreementObservationData {
  plant: PlantResponse | undefined;
  observation: SharingAgreementObservationResponse | undefined;
  isLoading: boolean;
  /** A plant or agreement that does not exist, or a plant of another community. */
  isNotFound: boolean;
  /**
   * Why the agreement has no observation (a draft is not in force), in the
   * catalogue's words; undefined when it has one.
   */
  notObservableMessage: string | undefined;
  error: unknown;
  refetch: () => void;
}

const isNotObservable = (error: unknown) => getFirstApiErrorCode(error) === "SHARING_AGREEMENT_NOT_OBSERVABLE";

/**
 * One agreement's observed sharing, behind the active-community guard: its
 * slice of the plant's analysis, asked for only once the plant is known to
 * belong to the active community, and cached apart from the plant's.
 */
export function useSharingAgreementObservationData(plantId: string, sharingAgreementId: string): SharingAgreementObservationData {
  const plantRead = usePlantInActiveCommunity(plantId);
  const { plant } = plantRead;
  const observationRead = useGetSharingAgreementObservation(plantId, sharingAgreementId, {
    query: { enabled: plant !== undefined && sharingAgreementId !== "", staleTime: OBSERVATION_STALE_TIME },
  });

  const isNotFound = plantRead.isNotFound || isNotFoundError(observationRead.error);
  const notObservable = isNotObservable(observationRead.error);
  return {
    plant,
    observation: observationRead.data,
    isLoading: plantRead.isLoading || (plant !== undefined && observationRead.isLoading),
    isNotFound,
    notObservableMessage: notObservable ? getFirstApiErrorMessage(observationRead.error, "") : undefined,
    error: isNotFound || notObservable ? null : (plantRead.error ?? observationRead.error),
    refetch: () => {
      if (plantRead.error) plantRead.refetch();
      if (observationRead.error) void observationRead.refetch();
    },
  };
}
