import { useGetPlantEnergyMetrics } from "../../../api/plants/plants";
import { GetPlantEnergyMetricsPeriod, type PlantEnergyMetricsResponse } from "../../../api/models";
import { calendarDayOf, dayAnchor, type Anchor } from "../../../components/period/historicalPeriod";

const LATEST_PRODUCTION_DAY = { period: GetPlantEnergyMetricsPeriod.LATEST_PRODUCTION_DAY };

/**
 * The plant's latest complete production day, as the server resolves it: the
 * anchor of "Producción por periodo" (#406). Asked only once the plant, and so
 * its community, is known.
 */
export function usePlantAnchorQuery(plantId: string | undefined) {
  return useGetPlantEnergyMetrics(plantId ?? "", LATEST_PRODUCTION_DAY, { query: { enabled: !!plantId } });
}

/** The anchor day, in the app's time zone; null when the plant has no production day yet. */
export const readDayAnchor = ({ period }: PlantEnergyMetricsResponse): Anchor | null =>
  period.startDate ? dayAnchor(calendarDayOf(period.startDate)) : null;
