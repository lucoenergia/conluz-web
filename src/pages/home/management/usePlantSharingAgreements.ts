import { useGetSharingAgreements } from "../../../api/sharing-agreements/sharing-agreements";
import type { PlantResponse, SharingAgreementResponse } from "../../../api/models";

export interface PlantSharingAgreements {
  /** `undefined` until loaded, and whenever the read failed. */
  agreements: SharingAgreementResponse[] | undefined;
  isError: boolean;
  retry: () => void;
}

/**
 * Every sharing agreement of one plant, for the management home (#198): one
 * request per plant.
 *
 * GET /plants/{plantId}/sharing-agreements is keyed by the plant alone, which
 * is why the bare hook is restricted. Here the plant is not an id from the URL
 * but a row of GET /communities/{communityId}/plants for the active community,
 * so it belongs to that community by construction, and the keyed Outlet
 * remounts the view -- and so this read -- when the community changes.
 */
export function usePlantSharingAgreements(plant: PlantResponse): PlantSharingAgreements {
  const { data, isError, refetch } = useGetSharingAgreements(plant.id);
  return { agreements: isError ? undefined : data, isError, retry: () => void refetch() };
}
