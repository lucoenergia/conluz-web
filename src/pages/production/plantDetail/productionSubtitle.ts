export type ProductionPeriodKind = "day" | "month" | "year" | "totals" | "dates";
export type DatesGranularity = "daily" | "monthly" | "yearly" | null;

/**
 * What one bar of the plant's production chart stands for, in Spanish
 * (UI-PLT-007). It follows the granularity the page requests: hours for a day,
 * days for a month or a short custom range, months for a year or a longer one,
 * years for the total or a range of several years.
 */
export function productionSubtitle(kind: ProductionPeriodKind, granularity: DatesGranularity): string {
  if (kind === "day") return "Producción por hora";
  if (kind === "year" || (kind === "dates" && granularity === "monthly")) return "Producción por mes";
  if (kind === "totals" || (kind === "dates" && granularity === "yearly")) return "Producción por año";
  return "Producción por día";
}
