import { useEffect } from "react";
import { useSearchParams } from "react-router";
import type { SupplyResponse } from "../../api/models";
import { SUPPLY_ID_PARAM } from "../../utils/routes";

export interface SelectedSupply {
  /** The selected supply, or `null` for "Todos mis puntos". */
  selected: SupplyResponse | null;
  select: (supplyId: string | null) => void;
}

/**
 * The supply held in ?supplyId= (UI-HIS-002), so another page can link here
 * with one preselected.
 *
 * An id that is not one of `supplies` -- someone else's, another community's,
 * a disabled or a deleted supply -- falls back to "Todos mis puntos" and is
 * removed from the address, without an error. Only once the listing has
 * succeeded: while it is pending or after it failed (`supplies` undefined),
 * nothing is known about the id, so the address is left alone.
 */
export function useSelectedSupply(supplies: SupplyResponse[] | undefined): SelectedSupply {
  const [searchParams, setSearchParams] = useSearchParams();
  const supplyId = searchParams.get(SUPPLY_ID_PARAM);
  const selected = (supplyId && supplies?.find((supply) => supply.id === supplyId)) || null;
  const isUnselectable = supplyId !== null && supplies !== undefined && selected === null;

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

  return { selected, select };
}
