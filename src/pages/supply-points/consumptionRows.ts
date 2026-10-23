import type { DatadisConsumption, SupplyConsumptionBucketResponse } from "../../api/models";

/**
 * One point of the supply detail page's consumption series, its energy in the
 * glossary's names. `date` and `time` are carried as the endpoint wrote them,
 * for the chart's labels.
 */
export interface ConsumptionRow {
  date?: string;
  time?: string;
  gridImportKWh: number;
  selfConsumptionKWh: number;
  surplusKWh: number;
}

/**
 * A consumption series as the page fetched it, tagged with the endpoint it came
 * from. The hourly and yearly series answer with Datadis records, which keep
 * their own field names; the daily and monthly series answer with buckets named
 * after the glossary (#294). The tag is set where the page picks the series, so
 * the shape is never guessed from the properties a row happens to carry.
 */
export type ConsumptionSeries =
  | { source: "datadis"; rows: DatadisConsumption[] | undefined }
  | { source: "bucket"; rows: SupplyConsumptionBucketResponse[] | undefined };

/** The series as internal rows; a missing figure counts as 0. Undefined while the series is. */
export function toConsumptionRows(series: ConsumptionSeries): ConsumptionRow[] | undefined {
  if (series.source === "datadis") {
    return series.rows?.map((row) => ({
      date: row.date,
      time: row.time,
      gridImportKWh: row.consumptionKWh || 0,
      selfConsumptionKWh: row.selfConsumptionEnergyKWh || 0,
      surplusKWh: row.surplusEnergyKWh || 0,
    }));
  }
  return series.rows?.map((row) => ({
    date: row.date,
    time: row.time,
    gridImportKWh: row.gridImportKWh || 0,
    selfConsumptionKWh: row.selfConsumptionKWh || 0,
    surplusKWh: row.surplusKWh || 0,
  }));
}
