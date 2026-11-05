import { useEffect } from "react";
import { useSearchParams } from "react-router";
import type { SupplyResponse } from "../../api/models";
import { outcomeFromResource, useActiveCommunityCapabilities } from "../../hooks/permissions";
import { SUPPLY_ID_PARAM } from "../../utils/routes";
import { useSupplyInActiveCommunity } from "../supply-points/useSupplyInActiveCommunity";

export interface SelectedSupply {
  /** The selected supply, or `null` for "Todos mis puntos". */
  selected: SupplyResponse | null;
  /**
   * A supply of the active community the caller does not own, opened by a
   * community admin through ?supplyId= (#252). When set, it is also `selected`.
   */
  viewed: SupplyResponse | null;
  select: (supplyId: string | null) => void;
}

/**
 * The supply held in ?supplyId= (UI-HIS-002), so another page can link here
 * with one preselected.
 *
 * One of `supplies`, the caller's own, is selected as it is. Any other id is
 * looked up only for a caller the active community grants `canManage`, and is
 * selectable when it is an enabled supply of the active community that opens
 * its figures to the caller (UI-HIS-001, #252). Everything else -- a member
 * following an admin's link, another community's supply, a disabled one, a
 * missing one, or a lookup that failed -- falls back to "Todos mis puntos" and
 * is removed from the address, without an error.
 *
 * Whether the supply belongs to the active community is not checked here: the
 * lookup goes through useSupplyInActiveCommunity, which withholds a supply of
 * another community, and the backend authorises the read itself. This hook
 * adds only what the supply's own state and capabilities say.
 *
 * The address changes only once all of that is known:
 * while the listing, the capability or the lookup is pending, or after the
 * listing failed (`supplies` undefined), the address is left alone.
 */
export function useSelectedSupply(supplies: SupplyResponse[] | undefined): SelectedSupply {
  const [searchParams, setSearchParams] = useSearchParams();
  const supplyId = searchParams.get(SUPPLY_ID_PARAM);
  const own = (supplyId && supplies?.find((supply) => supply.id === supplyId)) || null;

  const needsLookup = supplyId !== null && supplies !== undefined && own === null;
  // Asked only for an id that is not the caller's own.
  const canManage = useActiveCommunityCapabilities("canManage", { enabled: needsLookup });
  const mayLookUp = needsLookup && canManage.state === "allowed";
  const lookup = useSupplyInActiveCommunity(mayLookUp ? supplyId : "");

  const found = mayLookUp ? lookup.supply : undefined;
  const viewed =
    found &&
    found.enabled &&
    outcomeFromResource(found.capabilities, "canRead").state === "allowed"
      ? found
      : null;

  const isUnresolved = (needsLookup && canManage.state === "pending") || (mayLookUp && lookup.isLoading);
  const isUnselectable = needsLookup && !isUnresolved && viewed === null;

  useEffect(() => {
    if (!isUnselectable) return;
    setSearchParams(
      (params) => {
        params.delete(SUPPLY_ID_PARAM);
        return params;
      },
      { replace: true },
    );
  }, [isUnselectable, setSearchParams]);

  const select = (id: string | null) =>
    setSearchParams(
      (params) => {
        if (id) params.set(SUPPLY_ID_PARAM, id);
        else params.delete(SUPPLY_ID_PARAM);
        return params;
      },
      { replace: true },
    );

  return { selected: own ?? viewed, viewed, select };
}
