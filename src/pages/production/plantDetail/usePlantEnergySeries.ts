import {
  useGetPlantDailyEnergySeries,
  useGetPlantHourlyEnergySeries,
  useGetPlantMonthlyEnergySeries,
} from "../../../api/plants/plants";
import { useHistoricalPeriod } from "../../../components/period/HistoricalPeriodContext";
import type { PlantSeries } from "./plantSeries";

export type PlantEnergySeriesState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; series: PlantSeries };

interface SeriesQuery<T> {
  isError: boolean;
  isSuccess: boolean;
  data: T | undefined;
  refetch: () => unknown;
}

/**
 * The plant's production series over the selected period, at the period's
 * granularity (#406). Only that granularity's series is requested, and none
 * while the period is unknown.
 */
export function usePlantEnergySeries(plantId: string): PlantEnergySeriesState {
  const period = useHistoricalPeriod();
  const bounds = period ? { startDate: period.startDate, endDate: period.endDate } : { startDate: "", endDate: "" };
  const known = !!plantId;

  const hourly = useGetPlantHourlyEnergySeries(plantId, bounds, { query: { enabled: known && period?.granularity === "hourly" } });
  const daily = useGetPlantDailyEnergySeries(plantId, bounds, { query: { enabled: known && period?.granularity === "daily" } });
  const monthly = useGetPlantMonthlyEnergySeries(plantId, bounds, { query: { enabled: known && period?.granularity === "monthly" } });

  if (!period) return { status: "loading" };
  switch (period.granularity) {
    case "hourly":
      return stateOf(hourly, (buckets) => ({ kind: "hourly", buckets }));
    case "daily":
      return stateOf(daily, (buckets) => ({ kind: "daily", buckets }));
    case "monthly":
      return stateOf(monthly, (buckets) => ({ kind: "monthly", buckets }));
  }
}

function stateOf<T>(query: SeriesQuery<T>, tag: (data: T) => PlantSeries): PlantEnergySeriesState {
  if (query.isError) return { status: "error", retry: () => void query.refetch() };
  if (!query.isSuccess || query.data === undefined) return { status: "loading" };
  return { status: "ready", series: tag(query.data) };
}
