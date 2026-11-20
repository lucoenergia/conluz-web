import { CONSUMPTION_EVOLUTION_COPY, CONSUMPTION_LOOK, EstimatedPriceLabel, Evolution, LATEST, LAST_12, Mui, resolvePeriod, sxStyles, toConsumptionSeriesView } from "conluz-web";

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

/** The twelve months to September 2026, shaped like GET …/memberships/{userId}/consumption/monthly. */
function lastTwelveMonths() {
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((8 + index) % 12) + 1;
    const year = month >= 10 ? 2025 : 2026;
    const sun = [38, 52, 81, 104, 131, 148, 162, 151, 118, 84, 49, 41][month - 1];
    const self = Math.round(sun * 0.7);
    const consumption = [345, 320, 290, 260, 245, 270, 330, 310, 255, 270, 300, 340][month - 1];
    return {
      date: `${year}/${String(month).padStart(2, "0")}/01`,
      time: "00:00",
      selfConsumptionKWh: self,
      gridImportKWh: consumption - self,
      surplusKWh: Math.round(sun * 0.3),
      assignedProductionKWh: sun,
      savingsEur: Math.round(self * 0.15 * 100) / 100,
      tariffSource: "ESTIMATE",
      suppliesWithData: 3,
      supplyCount: 3,
    };
  });
}

const YEAR_PERIOD = resolvePeriod({ kind: "month", month: { year: 2026, month: 9 } }, { kind: "last12" }, [LAST_12]);
const MONTHLY_VIEW = toConsumptionSeriesView((YEAR_PERIOD as any).period, { kind: "membershipMonthly", buckets: lastTwelveMonths() as any });

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Mui.Box component="section" sx={{ ...sxStyles.softPanel, boxSizing: "border-box", width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Mui.Typography variant="h6" component="h2">
      {title}
    </Mui.Typography>
    {children}
  </Mui.Box>
);

export const DayByDay = () => (
  <Card title={CONSUMPTION_EVOLUTION_COPY.title.daily}>
    <Evolution
      view={DAILY_VIEW}
      look={CONSUMPTION_LOOK}
      copy={CONSUMPTION_EVOLUTION_COPY}
      extraLines={[]}
      priceLabel={<EstimatedPriceLabel estimatedPrice={{ eurPerKWh: 0.15 }} />}
    />
  </Card>
);

export const MonthByMonth = () => (
  <Card title={CONSUMPTION_EVOLUTION_COPY.title.monthly}>
    <Evolution
      view={MONTHLY_VIEW}
      look={CONSUMPTION_LOOK}
      copy={CONSUMPTION_EVOLUTION_COPY}
      extraLines={[]}
      priceLabel={<EstimatedPriceLabel estimatedPrice={{ eurPerKWh: 0.15 }} />}
    />
  </Card>
);
