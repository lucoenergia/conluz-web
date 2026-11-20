import { Mui, PeriodUsageCard } from "conluz-web";

/** One supply's figures for September 2026, shaped like GET …/supplies/{supplyId}/energy-metrics. */
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

const Frame = ({ children }: { children: React.ReactNode }) => <Mui.Box sx={{ width: "100%", maxWidth: 720 }}>{children}</Mui.Box>;

export const Available = () => (
  <Frame>
    <PeriodUsageCard metrics={SEPTEMBER as any} />
  </Frame>
);

/** "Todos mis puntos": the membership's figures, which leave the plant's own supply out of the headline. */
export const AllSuppliesWithAPlant = () => (
  <Frame>
    <PeriodUsageCard
      metrics={
        {
          period: SEPTEMBER.period,
          coverage: { hoursWithData: 2160, expectedHours: 2160, suppliesWithData: 3, supplyCount: 3 },
          savings: { amountEur: 72.75, tariffSource: "ESTIMATE", estimatedPrice: { eurPerKWh: 0.15 } },
          selfSufficiencyRatio: 0.42,
          selfConsumptionRatio: 0.67,
          selfConsumptionRatioStatus: "AVAILABLE",
          energy: { totalConsumptionKWh: 1155, gridImportKWh: 670, selfConsumptionKWh: 485, surplusKWh: 239, assignedProductionKWh: 724 },
          selfConsumptionRatioBasis: { selfConsumptionKWh: 485, assignedProductionKWh: 724, excludedPlantSupplyCount: 1 },
        } as any
      }
    />
  </Frame>
);

export const UsedEverything = () => (
  <Frame>
    <PeriodUsageCard
      metrics={
        {
          ...SEPTEMBER,
          energy: { totalConsumptionKWh: 160, gridImportKWh: 0, selfConsumptionKWh: 160, surplusKWh: 0, assignedProductionKWh: 160 },
          selfSufficiencyRatio: 1,
          selfConsumptionRatio: 1,
          selfConsumptionRatioBasis: { selfConsumptionKWh: 160, assignedProductionKWh: 160, excludedPlantSupplyCount: 0 },
        } as any
      }
    />
  </Frame>
);

export const NothingAssigned = () => (
  <Frame>
    <PeriodUsageCard
      metrics={
        {
          ...SEPTEMBER,
          energy: { totalConsumptionKWh: 298, gridImportKWh: 298, selfConsumptionKWh: 0, surplusKWh: 0, assignedProductionKWh: 0 },
          selfSufficiencyRatio: 0,
          selfConsumptionRatio: null,
          selfConsumptionRatioStatus: "NOTHING_ASSIGNED",
          selfConsumptionRatioBasis: { selfConsumptionKWh: 0, assignedProductionKWh: 0, excludedPlantSupplyCount: 0 },
        } as any
      }
    />
  </Frame>
);

export const PlantSupply = () => (
  <Frame>
    <PeriodUsageCard
      metrics={
        {
          ...SEPTEMBER,
          supply: { id: "b2d7e3f0-5a61-4c8e-9e02-7d4f1a6c3b95", code: "ES0031406987654321QW1A", name: "Cubierta del polideportivo" },
          energy: { totalConsumptionKWh: 84, gridImportKWh: 31, selfConsumptionKWh: 53, surplusKWh: 0, assignedProductionKWh: 53 },
          selfSufficiencyRatio: 0.63,
          selfConsumptionRatio: null,
          selfConsumptionRatioStatus: "NOT_APPLICABLE",
          selfConsumptionRatioBasis: { selfConsumptionKWh: 0, assignedProductionKWh: 0, excludedPlantSupplyCount: 0 },
        } as any
      }
    />
  </Frame>
);
