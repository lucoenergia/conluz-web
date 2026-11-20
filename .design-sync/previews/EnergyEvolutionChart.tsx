import { CONSUMPTION_LOOK, EnergyEvolutionChart, LATEST, Mui, resolvePeriod, toConsumptionSeriesView } from "conluz-web";

/** September 2026 for "Todos mis puntos", shaped like GET …/memberships/{userId}/consumption/daily: three supplies, day 14 with no record, day 22 from one supply only. */
function septemberDays() {
  return Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const sun = 3.2 + 2.1 * Math.sin(day / 2.3) + (day % 7 === 0 ? -1.8 : 0);
    const self = Math.max(0.6, Math.round(sun * 10) / 10);
    const grid = Math.round((9.4 - self * 0.6 + (day % 5) * 0.4) * 10) / 10;
    const surplus = Math.round(Math.max(0, sun - 2.9) * 10) / 10;
    const date = `2026/09/${String(day).padStart(2, "0")}`;
    if (day === 14) {
      return { date, time: "00:00", selfConsumptionKWh: 0, gridImportKWh: 0, surplusKWh: 0, assignedProductionKWh: 0, savingsEur: null, tariffSource: null, suppliesWithData: 0, supplyCount: 3 };
    }
    return {
      date,
      time: "00:00",
      selfConsumptionKWh: self,
      gridImportKWh: grid,
      surplusKWh: surplus,
      assignedProductionKWh: Math.round((self + surplus) * 10) / 10,
      savingsEur: Math.round(self * 0.15 * 100) / 100,
      tariffSource: "ESTIMATE",
      suppliesWithData: day === 22 ? 1 : 3,
      supplyCount: 3,
    };
  });
}

const SEPTEMBER = resolvePeriod({ kind: "month", month: { year: 2026, month: 9 } }, { kind: "latest" }, [LATEST]);
const DAILY_VIEW = toConsumptionSeriesView((SEPTEMBER as any).period, { kind: "membershipDaily", buckets: septemberDays() as any });

export const DayByDay = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <EnergyEvolutionChart view={DAILY_VIEW} look={CONSUMPTION_LOOK} extraLines={[]} />
  </Mui.Box>
);
