import { useGetSuppliesByUserId } from "../../api/users/users";
import type { SupplyResponse } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { isSupplyOutsideActiveCommunity } from "../supply-points/supplyCommunityScope";

export interface OwnSupplies {
  /** The caller's own enabled supplies in the active community; `undefined` until the listing has succeeded. */
  supplies: SupplyResponse[] | undefined;
  isLoading: boolean;
  error: unknown;
}

/**
 * The supplies the historical analysis page offers (UI-HIS-001): the caller's
 * own, read from GET /users/{me}/supplies for a member and a community admin
 * alike. The community's own listing would hand an admin every member's
 * supply.
 *
 * The listing spans every community the caller belongs to, so it is narrowed
 * to the active one. A disabled supply is left out until what a disabled
 * supply means is decided (#247).
 *
 * `supplies` stays `undefined` while the listing is pending or has failed, so
 * neither can be read as "owns none".
 */
export function useOwnSupplies(): OwnSupplies {
  const activeCommunityId = useActiveCommunity();
  const userId = useLoggedUser()?.id;

  const listing = useGetSuppliesByUserId(userId ?? "", {
    query: { enabled: !!userId && !!activeCommunityId },
  });

  const supplies = listing.isSuccess
    ? listing.data.filter((supply) => supply.enabled && !isSupplyOutsideActiveCommunity(supply, activeCommunityId))
    : undefined;

  return { supplies, isLoading: listing.isLoading, error: listing.error };
}
