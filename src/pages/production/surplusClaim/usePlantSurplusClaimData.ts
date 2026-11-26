import { useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import type { PlantResponse, PlantSurplusClaimResponse } from "../../../api/models";
import { useGetPlantSurplusClaim } from "../../../api/plants/plants";
import { usePlantInActiveCommunity } from "../usePlantInActiveCommunity";
import { isNotFoundError } from "../useSharingAgreementsData";

export interface PlantSurplusClaimData {
  plant: PlantResponse | undefined;
  /** The month shown. While another month loads, the previous one stays, with `isSwitchingMonth`. */
  claim: PlantSurplusClaimResponse | undefined;
  isLoading: boolean;
  /** The month asked for is loading, and `claim` is still the previous one. */
  isSwitchingMonth: boolean;
  /** A plant that does not exist, or belongs to another community. */
  isNotFound: boolean;
  error: unknown;
  refetch: () => void;
}

const isBadRequest = (error: unknown) =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status === 400;

/**
 * The plant's surplus claim for `month`, or for the month the server picks
 * when there is none, behind the active-community guard: the claim is asked
 * for only once the plant is known to belong to the active community and
 * grants `canManage`, so a foreign plant id from the URL never triggers it.
 *
 * A month the server refuses (400: not closed yet, or not a month) is not an
 * error to show: `onMonthRefused` drops it, and the default month loads
 * instead (UI-SCL-001).
 */
export function usePlantSurplusClaimData(
  plantId: string,
  month: string | undefined,
  onMonthRefused: () => void,
): PlantSurplusClaimData {
  const plantRead = usePlantInActiveCommunity(plantId);
  const { plant } = plantRead;
  const claimRead = useGetPlantSurplusClaim(plantId, month === undefined ? undefined : { month }, {
    query: { enabled: plant?.capabilities.canManage === true, placeholderData: keepPreviousData },
  });

  const isMonthRefused = month !== undefined && isBadRequest(claimRead.error);
  useEffect(() => {
    if (isMonthRefused) onMonthRefused();
  }, [isMonthRefused, onMonthRefused]);

  const isNotFound = plantRead.isNotFound || isNotFoundError(claimRead.error);
  const claimError = isMonthRefused ? null : claimRead.error;
  return {
    plant,
    claim: isMonthRefused ? undefined : claimRead.data,
    isLoading: plantRead.isLoading || (plant !== undefined && (claimRead.isLoading || isMonthRefused)),
    isSwitchingMonth: claimRead.isPlaceholderData,
    isNotFound,
    error: isNotFound ? null : (plantRead.error ?? claimError),
    refetch: () => {
      if (plantRead.error) plantRead.refetch();
      if (claimRead.error) void claimRead.refetch();
    },
  };
}
