import { useGetSupplyEnergyToday } from "../../api/supplies/supplies";
import { INVERTER_REFRESH_MS } from "../production/plantDetail/useInverterToday";

/**
 * Today's energy assigned to one supply (UI-TDY-007). The figures come from the
 * plants' inverter snapshots, which arrive every 5 minutes, so the data is
 * asked again every 5 minutes while the document is visible, and when the page
 * regains focus (the app's default is off; see createAppQueryClient). Nothing
 * is asked before a supply is selected.
 *
 * The supply id comes from useOwnSupplies, narrowed to the active community, or
 * from useSelectedSupply's viewed supply, which useSupplyInActiveCommunity has
 * admitted; the keyed Outlet remounts the page when the community changes.
 */
export function useSupplyEnergyToday(supplyId: string | undefined) {
  return useGetSupplyEnergyToday(supplyId ?? "", {
    query: {
      enabled: !!supplyId,
      refetchInterval: INVERTER_REFRESH_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  });
}
