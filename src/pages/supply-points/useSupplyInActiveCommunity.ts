import { useGetSupply } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";

export interface SupplyInActiveCommunity {
  supply: SupplyResponse | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * useGetSupply, behind the same wrapper boundary as usePlantInActiveCommunity.
 *
 * It applies no community guard yet, and that is the point of it existing:
 * GET /supplies/{supplyId} is authorised on membership rather than on the
 * selected community, and SupplyResponse carries no community reference, so
 * there is nothing to compare an active community against. A supply from
 * another of the user's communities therefore still renders when reached by
 * bookmark, pasted URL or reload -- switching community inside the app is
 * already handled by the redirect in AuthenticatedLayout.
 *
 * TODO: add the guard once the backend exposes communityId on SupplyResponse
 * (tracked as a separate backend issue). The implementation is then the same
 * two lines as isPlantOutsideActiveCommunity, and this is the single place they
 * need to go -- which is why the raw hook is restricted to this module.
 *
 * SupplyCoefficientHistorySection, rendered on the detail page, already scopes
 * its own data via selectPeriodsInCommunity and is unaffected.
 */
export function useSupplyInActiveCommunity(supplyId: string): SupplyInActiveCommunity {
  const { data: supply, isLoading, error, refetch } = useGetSupply(supplyId);
  return { supply, isLoading, error, refetch };
}
