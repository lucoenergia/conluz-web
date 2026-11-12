import { useGetPlantEnergyMetrics } from "../../../api/plants/plants";
import type { PlantEnergyMetricsResponse } from "../../../api/models";
import { useHistoricalPeriod } from "../../../components/period/HistoricalPeriodContext";

export type PlantPeriodMetricsState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; metrics: PlantEnergyMetricsResponse };

/**
 * The plant's production over the selected period: the period total (#406).
 * Asked by the period's explicit bounds, and not at all while the period is
 * unknown.
 */
export function usePlantPeriodMetrics(plantId: string): PlantPeriodMetricsState {
  const period = useHistoricalPeriod();
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : {};

  const query = useGetPlantEnergyMetrics(plantId, bounds, { query: { enabled: !!period && !!plantId } });

  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess) return { status: "loading" };
  return { status: "ready", metrics: query.data };
}
