import { useMemo } from "react";
import type { SupplyResponse } from "../../api/models";
import { useOwnSupplies } from "../historical-analysis/useOwnSupplies";
import { useSelectedSupply } from "../historical-analysis/useSelectedSupply";

export interface TodaySupply {
  /** The caller's own supplies in the active community, without the ones backing a plant; `undefined` until the listing has succeeded. */
  supplies: SupplyResponse[] | undefined;
  isLoading: boolean;
  error: unknown;
  /** The supply shown: the one in ?supplyId=, else the first own one. `null` while that is still being resolved, or when there is none. */
  selected: SupplyResponse | null;
  /** A supply of the community the caller does not own, opened by a community admin from its detail page. */
  viewed: SupplyResponse | null;
  isResolving: boolean;
  lookupFailed: boolean;
  retryLookup: () => void;
  select: (supplyId: string | null) => void;
}

/**
 * The supply the "Datos de hoy" page shows (UI-TDY-002, UI-TDY-003).
 *
 * The selector offers the caller's own supplies in the active community, as
 * "Mi consumo y ahorro" does, without the ones that back a plant: a plant's
 * own point receives no share of its production. ?supplyId= preselects one of
 * them, and otherwise the first is shown: there is no "Todos mis puntos" here.
 *
 * Any other id goes through the same lookup as "Mi consumo y ahorro"
 * (useSelectedSupply): a community admin may open an enabled supply of the
 * active community that reports canRead, and it sits in the selector's
 * "Punto que estás consultando" group. A supply backing a plant is ignored
 * there too, as is an unknown or unreadable id: the page shows what it would
 * show without the parameter.
 */
export function useTodaySupply(): TodaySupply {
  const { supplies, isLoading, error } = useOwnSupplies();
  const own = useMemo(() => supplies?.filter((supply) => !supply.plant), [supplies]);
  const resolved = useSelectedSupply(own);

  const viewed = resolved.viewed && !resolved.viewed.plant ? resolved.viewed : null;
  const ownSelected = resolved.selected && resolved.selected !== resolved.viewed ? resolved.selected : null;
  // While an id the caller does not own is being looked up, nothing is shown
  // yet: falling back to the first own supply would show, and ask, another.
  const selected = resolved.isResolving ? null : (ownSelected ?? viewed ?? own?.[0] ?? null);

  return {
    supplies: own,
    isLoading,
    error,
    selected,
    viewed,
    isResolving: resolved.isResolving,
    lookupFailed: resolved.lookupFailed,
    retryLookup: resolved.retryLookup,
    select: resolved.select,
  };
}
