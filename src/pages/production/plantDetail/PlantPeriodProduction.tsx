import { useMemo, type FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { ActionStatus } from "../../../components/ActionStatus/ActionStatus";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert/LoadErrorAlert";
import { Notice } from "../../../components/Notice/Notice";
import { NeutralNotice } from "../../../components/EnergyFigures/NeutralNotice";
import { PeriodHeader } from "../../../components/EnergyFigures/PeriodHeader";
import { ENERGY_COLORS } from "../../../components/EnergyFigures/energyColors";
import { Evolution } from "../../../components/evolution/Evolution";
import { HistoricalPeriodContext, useHistoricalPeriod } from "../../../components/period/HistoricalPeriodContext";
import type { HistoricalPeriod } from "../../../components/period/historicalPeriod";
import { PeriodSelector } from "../../../components/period/PeriodSelector";
import type { HistoricalAnchor } from "../../../components/period/useHistoricalAnchor";
import type { HistoricalPeriodState } from "../../../components/period/useHistoricalPeriodState";
import type { PlantEnergyMetricsResponse } from "../../../api/models";
import { colors, radii } from "../../../theme/tokens";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { PlantSection } from "./PlantSection";
import { PLANT_PRESETS, plantPublicationText } from "./plantPeriod";
import { PLANT_EVOLUTION_COPY, PLANT_LOOK, toPlantSeriesView, type PlantSeries } from "./plantSeries";
import { usePlantEnergySeries } from "./usePlantEnergySeries";
import { usePlantPeriodMetrics } from "./usePlantPeriodMetrics";
import { PERIOD_PRODUCTION_ICON } from "./sectionIcons";

export const PERIOD_PRODUCTION_TITLE = "Producción por periodo";
export const PERIOD_PRODUCTION_DESCRIPTION = "Energía vertida a la red, medida por la distribuidora";
export const NO_DISTRIBUTOR_DATA = "Todavía no hay datos de la distribuidora para esta planta";
export const ANCHOR_LOADING_LABEL = "Cargando la producción de la planta…";
export const ANCHOR_ERROR = "No se pudo cargar la producción de la planta. Comprueba tu conexión e inténtalo de nuevo.";
export const TOTAL_LABEL = "Total del periodo";
export const TOTAL_LOADING_LABEL = "Cargando el total del periodo…";
export const TOTAL_ERROR = "No se pudo cargar el total del periodo. Comprueba tu conexión e inténtalo de nuevo.";
export const NO_TOTAL = "Sin datos";
export const PARTIAL_TOTAL_NOTICE = "Faltan datos de la distribuidora en parte del periodo: el total solo suma las horas con datos.";
export const SERIES_LOADING_LABEL = "Cargando la evolución de la producción…";
export const SERIES_ERROR = "No se pudo cargar la evolución de la producción. Comprueba tu conexión e inténtalo de nuevo.";

interface PlantPeriodProductionProps {
  plantId: string;
  anchor: HistoricalAnchor;
  period: HistoricalPeriodState;
}

/**
 * "Producción por periodo" (UI-PLT-011): what the plant exported to the grid,
 * as the distributor measured it, over a period anchored to the plant's latest
 * complete production day. Never compared with another period, and never
 * mixed with the inverter's figures.
 */
export const PlantPeriodProduction: FC<PlantPeriodProductionProps> = ({ plantId, anchor, period }) => {
  const { resolution } = period;
  const resolved = resolution?.status === "ok" ? resolution : null;
  return (
    <PlantSection title={PERIOD_PRODUCTION_TITLE} description={PERIOD_PRODUCTION_DESCRIPTION} icon={PERIOD_PRODUCTION_ICON}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 2 }}>
        {/* Mounted before the anchor resolves, so a clamp the page arrives with is announced. */}
        <ActionStatus message={period.clampNotice} />
        {anchor.status === "loading" && (
          <Skeleton variant="rounded" height={56} role="progressbar" aria-label={ANCHOR_LOADING_LABEL} sx={{ maxWidth: 560 }} />
        )}
        {anchor.status === "error" && <LoadErrorAlert message={ANCHOR_ERROR} onRetry={anchor.retry} />}
        {/* Neutral, not a failure: the distributor has published no production day for the plant yet. */}
        {anchor.status === "none" && <NeutralNotice>{NO_DISTRIBUTOR_DATA}</NeutralNotice>}
        {anchor.status === "ready" && (
          <>
            <Box sx={{ maxWidth: 560 }}>
              <PeriodSelector anchor={anchor.anchor} presets={PLANT_PRESETS} selection={period.selection} onSelect={period.select} />
            </Box>
            {period.clampNotice && <Notice severity="info">{period.clampNotice}</Notice>}
            {resolved && <PeriodHeader anchor={anchor.anchor} resolution={resolved} publication={plantPublicationText} />}
            <HistoricalPeriodContext.Provider value={resolved?.period}>
              <PeriodContent plantId={plantId} />
            </HistoricalPeriodContext.Provider>
          </>
        )}
      </Box>
    </PlantSection>
  );
};

/** The period's total and its chart. Nothing renders, and nothing is fetched, until the period is known. */
const PeriodContent: FC<{ plantId: string }> = ({ plantId }) => {
  const period = useHistoricalPeriod();
  const metrics = usePlantPeriodMetrics(plantId);
  const series = usePlantEnergySeries(plantId);
  if (!period) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {metrics.status === "loading" && <Skeleton variant="rounded" height={72} role="progressbar" aria-label={TOTAL_LOADING_LABEL} />}
      {metrics.status === "error" && <LoadErrorAlert message={TOTAL_ERROR} onRetry={metrics.retry} />}
      {metrics.status === "ready" && <PeriodTotal metrics={metrics.metrics} />}
      {series.status === "loading" && <Skeleton variant="rounded" height={320} role="progressbar" aria-label={SERIES_LOADING_LABEL} />}
      {series.status === "error" && <LoadErrorAlert message={SERIES_ERROR} onRetry={series.retry} />}
      {series.status === "ready" && <PeriodEvolution period={period} series={series.series} />}
    </Box>
  );
};

/**
 * The period total, from the metrics of the period itself, never summed from
 * the buckets. A null total is no record at all, not a measured zero. The
 * figure stays in the text colour: gold is only ever a mark (UI-PLT-013).
 */
const PeriodTotal: FC<{ metrics: PlantEnergyMetricsResponse }> = ({ metrics }) => {
  const total = metrics.energy.productionKWh;
  const partial = total !== null && metrics.coverage.hoursWithData < metrics.coverage.expectedHours;
  return (
    <Box role="group" aria-label={TOTAL_LABEL} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: radii.small, bgcolor: ENERGY_COLORS.assigned, flexShrink: 0 }} />
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          {TOTAL_LABEL}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        component="p"
        sx={{ color: colors.text.primary, fontWeight: 700 }}
      >
        {total === null ? NO_TOTAL : formatKilowattHours(total)}
      </Typography>
      {partial && <NeutralNotice>{PARTIAL_TOTAL_NOTICE}</NeutralNotice>}
    </Box>
  );
};

const PeriodEvolution: FC<{ period: HistoricalPeriod; series: PlantSeries }> = ({ period, series }) => {
  const view = useMemo(() => toPlantSeriesView(period, series), [period, series]);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle1" component="h3" sx={{ color: colors.text.primary, fontWeight: 600 }}>
        {PLANT_EVOLUTION_COPY.title[view.granularity]}
      </Typography>
      {/* The series has no savings, so no price is asked for or shown. */}
      <Evolution view={view} look={PLANT_LOOK} copy={PLANT_EVOLUTION_COPY} extraLines={[]} priceLabel={null} />
    </Box>
  );
};
