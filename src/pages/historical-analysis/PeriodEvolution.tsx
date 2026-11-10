import { useMemo, type FC } from "react";
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import type { SupplyResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { colors } from "../../theme/tokens";
import { HomeCard } from "../home/HomeCard";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { ENERGY_COLORS, SAVINGS_COLOR, swatch } from "../../components/EnergyFigures/energyColors";
import { EstimatedPriceLabel } from "../../components/EnergyFigures/EstimatedPriceLabel";
import { SeriesLegend, type LegendItem } from "../../components/evolution/SeriesLegend";
import {
  GRID_IMPORT_SERIES,
  SAVINGS_SERIES,
  SELF_CONSUMPTION_SERIES,
  SURPLUS_SERIES,
  TECHNICAL_TERM,
  toConsumptionSeriesView,
  type ConsumptionSeries,
  type ConsumptionSeriesView,
} from "../../components/evolution/consumptionSeries";
import { EnergyEvolutionChart, SavingsEvolutionChart } from "../../components/evolution/EvolutionCharts";
import { EnergyEvolutionRows, SavingsEvolutionRows } from "../../components/evolution/EvolutionRows";
import { StateMark, type StateMarkKind } from "../../components/evolution/StateMark";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { usePeriodConsumptionSeries } from "./usePeriodConsumptionSeries";
import { usePeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

const TITLE = { hourly: "Tu energía hora a hora", daily: "Tu energía día a día", monthly: "Tu energía mes a mes" } as const;
const LOADING_LABEL = "Cargando la evolución de tu energía…";
const LOAD_ERROR = "No se pudo cargar la evolución de tu energía. Comprueba tu conexión e inténtalo de nuevo.";
/** Where the separate bar sits, on each layout (UI-HIS-017). */
const CAPTION = {
  wide: "La barra apilada es tu consumo. La barra morada, a su lado, es energía asignada que no usaste: no forma parte de tu consumo.",
  narrow: "La barra gruesa es tu consumo. La fina morada, debajo, es energía asignada que no usaste: no forma parte de tu consumo.",
} as const;

/** A legend group: its heading, then its swatches. */
const LegendGroup: FC<{ heading: string; items: LegendItem[] }> = ({ heading, items }) => (
  <Box role="group" aria-label={heading} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, rowGap: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600, color: colors.text.primary }}>
      {heading}:
    </Typography>
    <SeriesLegend items={items} />
  </Box>
);

const MARKER_KEY: { kind: StateMarkKind; label: string }[] = [
  { kind: "ring", label: "Sin datos: no hay lecturas" },
  { kind: "dot", label: "Cero medido" },
  { kind: "asterisk", label: "Datos parciales" },
];

/** What each mark on the charts means, in words. */
const MarkerKey: FC = () => (
  <Box
    component="ul"
    aria-label="Marcas de estado"
    sx={{ listStyle: "none", p: 0, m: 0, pt: 1.5, borderTop: `1px solid ${colors.border.light}`, display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}
  >
    {MARKER_KEY.map(({ kind, label }) => (
      <Box component="li" key={kind} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <StateMark kind={kind} />
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {label}
        </Typography>
      </Box>
    ))}
  </Box>
);

const Evolution: FC<{
  view: ConsumptionSeriesView;
  isPlantSupply: boolean;
  estimatedPrice: Parameters<typeof EstimatedPriceLabel>[0]["estimatedPrice"];
}> = ({ view, isPlantSupply, estimatedPrice }) => {
  const theme = useTheme();
  // Below sm the charts are rows, and the page scrolls only vertically (UI-HIS-025).
  const isWide = useMediaQuery(theme.breakpoints.up("sm"), { noSsr: true });
  return (
    <HomeCard title={TITLE[view.granularity]} icon={BarChartRoundedIcon}>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        {view.coverageText}
      </Typography>
      {view.gapsNotice && <NeutralNotice>{view.gapsNotice}</NeutralNotice>}
      {view.partialNotice && <NeutralNotice>{view.partialNotice}</NeutralNotice>}
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 4, rowGap: 0.5 }}>
        <LegendGroup
          heading="Tu consumo"
          items={[
            { label: SELF_CONSUMPTION_SERIES, companion: TECHNICAL_TERM[SELF_CONSUMPTION_SERIES], swatch: swatch.solid(ENERGY_COLORS.community) },
            { label: GRID_IMPORT_SERIES, swatch: swatch.solid(ENERGY_COLORS.grid) },
          ]}
        />
        <LegendGroup
          heading="Asignada que no usaste"
          items={[{ label: SURPLUS_SERIES, companion: TECHNICAL_TERM[SURPLUS_SERIES], swatch: swatch.solid(ENERGY_COLORS.exported) }]}
        />
      </Box>
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {isWide ? CAPTION.wide : CAPTION.narrow}
      </Typography>
      {isWide ? <EnergyEvolutionChart view={view} isPlantSupply={isPlantSupply} /> : <EnergyEvolutionRows view={view} isPlantSupply={isPlantSupply} />}
      <SeriesLegend items={[{ label: SAVINGS_SERIES, swatch: swatch.solid(SAVINGS_COLOR) }]} />
      <EstimatedPriceLabel estimatedPrice={estimatedPrice} />
      {isWide ? <SavingsEvolutionChart view={view} isPlantSupply={isPlantSupply} /> : <SavingsEvolutionRows view={view} />}
      <MarkerKey />
    </HomeCard>
  );
};

const ReadyEvolution: FC<{ period: HistoricalPeriod; series: ConsumptionSeries; selected: SupplyResponse | null }> = ({
  period,
  series,
  selected,
}) => {
  const view = useMemo(() => toConsumptionSeriesView(period, series), [period, series]);
  // Already cached: the period card asked for the same metrics (#249).
  const metrics = usePeriodEnergyMetrics(selected);
  const estimatedPrice = metrics.status === "ready" ? metrics.metrics.savings.estimatedPrice : null;
  return <Evolution view={view} isPlantSupply={!!selected?.plant} estimatedPrice={estimatedPrice} />;
};

/**
 * The energy and the savings of the selected period, bucket by bucket (#250).
 * Nothing renders, and nothing is fetched, until the period is known.
 */
export const PeriodEvolution: FC<{ selected: SupplyResponse | null }> = ({ selected }) => {
  const period = useHistoricalPeriod();
  const state = usePeriodConsumptionSeries(selected);
  if (!period) return null;
  if (state.status === "error") return <LoadErrorAlert message={LOAD_ERROR} onRetry={state.retry} />;
  if (state.status === "loading") return <Skeleton variant="rounded" height={520} role="progressbar" aria-label={LOADING_LABEL} />;
  return <ReadyEvolution period={period} series={state.series} selected={selected} />;
};
