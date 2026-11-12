import { useGetPlantInverterProductionToday } from "../../../api/plants/plants";

/** Inverter snapshots arrive every 5 minutes: asking more often would show nothing new. */
export const INVERTER_REFRESH_MS = 5 * 60_000;

/**
 * Today's inverter production of the plant (UI-PLT-012). Without refetching,
 * "Actualizado a las" and the server-computed `stale` would freeze while the
 * page stays open, so it is asked again every 5 minutes while the document is
 * visible, not while it is hidden, and again when the page regains focus --
 * the one plant read that opts back into it (the app's default is off; see
 * createAppQueryClient). Nothing is asked before the plant is known.
 */
export function useInverterToday(plantId: string | undefined) {
  return useGetPlantInverterProductionToday(plantId ?? "", {
    query: {
      enabled: !!plantId,
      refetchInterval: INVERTER_REFRESH_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
  });
}
