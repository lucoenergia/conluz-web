import { useMemo, type FC } from "react";
import { Skeleton } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import type { SupplyResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { HomeCard } from "../home/HomeCard";
import { EstimatedPriceLabel } from "../../components/EnergyFigures/EstimatedPriceLabel";
import {
  CONSUMPTION_EVOLUTION_COPY,
  CONSUMPTION_LOOK,
  PLANT_TOOLTIP_TEXT,
  toConsumptionSeriesView,
  type ConsumptionSeries,
} from "../../components/evolution/consumptionSeries";
import { Evolution } from "../../components/evolution/Evolution";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { usePeriodConsumptionSeries } from "./usePeriodConsumptionSeries";
import { usePeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

const LOADING_LABEL = "Cargando la evolución de tu energía…";
const LOAD_ERROR = "No se pudo cargar la evolución de tu energía. Comprueba tu conexión e inténtalo de nuevo.";

/** The price the period's savings were estimated with (#249). Already cached: the period card asked for the same metrics. */
const PeriodPriceLabel: FC<{ selected: SupplyResponse | null }> = ({ selected }) => {
  const metrics = usePeriodEnergyMetrics(selected);
  return <EstimatedPriceLabel estimatedPrice={metrics.status === "ready" ? metrics.metrics.savings.estimatedPrice : null} />;
};

const ReadyEvolution: FC<{ period: HistoricalPeriod; series: ConsumptionSeries; selected: SupplyResponse | null }> = ({
  period,
  series,
  selected,
}) => {
  const view = useMemo(() => toConsumptionSeriesView(period, series), [period, series]);
  return (
    <HomeCard title={CONSUMPTION_EVOLUTION_COPY.title[view.granularity]} icon={BarChartRoundedIcon}>
      <Evolution
        view={view}
        look={CONSUMPTION_LOOK}
        copy={CONSUMPTION_EVOLUTION_COPY}
        extraLines={selected?.plant ? [PLANT_TOOLTIP_TEXT] : []}
        priceLabel={<PeriodPriceLabel selected={selected} />}
      />
    </HomeCard>
  );
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
