import { useMemo } from "react";
import type { SupplyResponse } from "../../api/models";
import { useOwnSupplies } from "../historical-analysis/useOwnSupplies";
import { useSelectedSupply } from "../historical-analysis/useSelectedSupply";

export interface TodaySupply {
  /**
   * `own`: one of the caller's supplies is shown, with the selector.
   * `admin`: a supply the caller may read but does not own, opened by its id.
   * `none`: the caller owns no supply here and opened no other.
   * `pending`: not known yet.
   * `listingFailed`: the caller's own supplies could not be read.
   * `lookupFailed`: the lookup of an id the caller does not own failed, and there is no own supply to show instead.
   */
  mode: "own" | "admin" | "none" | "pending" | "listingFailed" | "lookupFailed";
  supply: SupplyResponse | null;
  /** The supplies the selector offers: the caller's own in the active community, without the ones backing a plant. */
  options: SupplyResponse[];
  isLoadingOptions: boolean;
  listingError: unknown;
  retryLookup: () => void;
  select: (supplyId: string | null) => void;
}

/**
 * The supply the "Datos de hoy" page shows (UI-TDY-002, UI-TDY-003).
 *
 * The selector offers the caller's own supplies in the active community, as
 * "Mi consumo y ahorro" does, without the ones that back a plant: a plant's
 * own point receives no share of its production. ?supplyId= preselects one of
 * them, and otherwise the first is shown.
 *
 * Any other id goes through the same lookup as "Mi consumo y ahorro"
 * (useSelectedSupply): a community admin may open an enabled supply of the
 * active community that reports canRead. That supply is shown on its own, in
 * the admin view, and never joins the selector. A supply backing a plant is
 * ignored there too, as is an unknown or unreadable id: the page shows what it
 * would show without the parameter. The admin view takes precedence over
 * owning no supply.
 */
export function useTodaySupply(): TodaySupply {
  const { supplies, isLoading, error } = useOwnSupplies();
  const options = useMemo(() => supplies?.filter((supply) => !supply.plant), [supplies]);
  const { selected, viewed, isResolving, lookupFailed, retryLookup, select } = useSelectedSupply(options);

  const base = { options: options ?? [], isLoadingOptions: isLoading, listingError: error, retryLookup, select };

  if (viewed && !viewed.plant) return { ...base, mode: "admin", supply: viewed };
  if (options === undefined && !isLoading && error) return { ...base, mode: "listingFailed", supply: null };
  if (options === undefined || isResolving) return { ...base, mode: "pending", supply: null };
  const own = selected && selected !== viewed ? selected : null;
  if (own) return { ...base, mode: "own", supply: own };
  if (options.length > 0) return { ...base, mode: "own", supply: options[0] };
  if (lookupFailed) return { ...base, mode: "lookupFailed", supply: null };
  return { ...base, mode: "none", supply: null };
}
