import { useGetSupply } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { isSupplyOutsideActiveCommunity } from "./supplyCommunityScope";

export interface SupplyInActiveCommunity {
  /** Withheld while the supply belongs to another community. */
  supply: SupplyResponse | undefined;
  isLoading: boolean;
  /** True for a real 404 *and* for a supply outside the selected community. */
  isNotFound: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * useGetSupply, behind the active-community guard.
 *
 * GET /supplies/{supplyId} is authorised on membership rather than on the
 * selected community, so a supply from another of the user's communities
 * answers 200 when reached by bookmark, pasted URL or reload. Since
 * SupplyResponse carries the community it belongs to, that case is detectable
 * here and folded into isNotFound, so pages reuse the empty state they already
 * have for a supply that does not exist rather than growing a second one.
 *
 * Switching community inside the app is handled earlier, by the redirect in
 * AuthenticatedLayout; this is the case where no switch happens at all.
 */
export function useSupplyInActiveCommunity(supplyId: string): SupplyInActiveCommunity {
  const activeCommunityId = useActiveCommunity();
  const { data: supply, isLoading, error, refetch } = useGetSupply(supplyId);

  const isForeign = isSupplyOutsideActiveCommunity(supply, activeCommunityId);
  const isNotFound =
    isForeign || (error as { response?: { status?: number } } | null)?.response?.status === 404;

  return {
    supply: isForeign ? undefined : supply,
    isLoading,
    isNotFound,
    error: isNotFound ? null : error,
    refetch,
  };
}
