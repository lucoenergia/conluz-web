import { Mui, PeriodTotals } from "conluz-web";

const SEPTEMBER = {
  supply: { id: "6f1c2a9e-0d4b-4a51-9f37-2be0c1d8a4f2", code: "ES0031406912345678JN0F", name: "Casa de Lucía" },
  period: { startDate: "2026-09-01T00:00:00+02:00", endDate: "2026-10-01T00:00:00+02:00" },
  coverage: { hoursWithData: 720, expectedHours: 720 },
  energy: { totalConsumptionKWh: 312, gridImportKWh: 181, selfConsumptionKWh: 131, surplusKWh: 64, assignedProductionKWh: 195 },
  savings: { amountEur: 19.65, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } },
  selfSufficiencyRatio: 0.42,
  selfConsumptionRatio: 0.67,
  selfConsumptionRatioStatus: "AVAILABLE",
  selfConsumptionRatioBasis: { selfConsumptionKWh: 131, assignedProductionKWh: 195, excludedPlantSupplyCount: 0 },
} as const;

export const MemberSupply = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PeriodTotals metrics={SEPTEMBER as any} isPlantSupply={false} />
  </Mui.Box>
);

export const PlantSupply = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PeriodTotals
      metrics={
        {
          ...SEPTEMBER,
          energy: { totalConsumptionKWh: 84, gridImportKWh: 31, selfConsumptionKWh: 53, surplusKWh: 0, assignedProductionKWh: 53 },
          savings: { amountEur: 7.95, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } },
        } as any
      }
      isPlantSupply
    />
  </Mui.Box>
);

export const Unpriced = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <PeriodTotals metrics={{ ...SEPTEMBER, savings: { amountEur: null, tariffSource: "ESTIMATE", estimatedPrice: null } } as any} isPlantSupply={false} />
  </Mui.Box>
);
