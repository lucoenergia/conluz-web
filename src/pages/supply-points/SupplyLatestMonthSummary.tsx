import { useId, type FC } from "react";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import type { SupplyEnergyMetricsResponse, SupplyResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { PeriodHeader } from "../../components/EnergyFigures/PeriodHeader";
import { PeriodTotals } from "../../components/EnergyFigures/PeriodTotals";
import { PeriodUsageCard } from "../../components/EnergyFigures/PeriodUsageCard";
import { plantSupplyNotice } from "../../components/EnergyFigures/periodUsage";
import { outcomeFromResource } from "../../hooks/permissions";
import { colors } from "../../theme/tokens";
import { HISTORICAL_ANALYSIS_PATH, SUPPLY_ID_PARAM } from "../../utils/routes";
import { resolvePeriod, type CalendarMonth } from "../../components/period/historicalPeriod";
import { useSupplyLatestMonth } from "./useSupplyLatestMonth";

const TITLE = "Último mes publicado";
const LOADING_LABEL = "Cargando los datos del punto…";
const LOAD_ERROR = "No se pudieron cargar los datos de energía de este punto. Comprueba tu conexión e inténtalo de nuevo.";
const NOTHING_PUBLISHED = "Todavía no hay datos publicados de este punto.";
const INCOMPLETE_DATA = "Faltan datos de parte de este periodo: las cifras suman solo los datos disponibles.";
const FULL_ANALYSIS = "Ver análisis completo";

/**
 * The supply's latest published month (#252): the period header, the period
 * card and the four totals the historical analysis page shows for this supply
 * and "Último mes publicado" -- the same components, fed by the same request.
 * No period selector and no chart: the full analysis is one link away.
 */
export const SupplyLatestMonthSummary: FC<{ supply: SupplyResponse }> = ({ supply }) => {
  const headingId = useId();
  const state = useSupplyLatestMonth(supply);
  // The backend opens a supply's figures to its owner and to an admin of its
  // community, and says so in canRead: the analysis page reads the same.
  const canAnalyse = outcomeFromResource(supply.capabilities, "canRead").state === "allowed";

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography id={headingId} variant="h5" component="h2" sx={{ fontWeight: 600, color: colors.text.primary }}>
          {TITLE}
        </Typography>
        {canAnalyse && (
          <Button
            component={RouterLink}
            to={`${HISTORICAL_ANALYSIS_PATH}?${new URLSearchParams({ [SUPPLY_ID_PARAM]: supply.id })}`}
            variant="outlined"
            size="small"
            startIcon={<InsightsRoundedIcon />}
          >
            {FULL_ANALYSIS}
          </Button>
        )}
      </Box>
      {state.status === "loading" && <Skeleton variant="rounded" height={280} role="progressbar" aria-label={LOADING_LABEL} />}
      {state.status === "error" && <LoadErrorAlert message={LOAD_ERROR} onRetry={state.retry} />}
      {state.status === "none" && <NeutralNotice>{NOTHING_PUBLISHED}</NeutralNotice>}
      {state.status === "ready" && <LatestMonth supply={supply} anchor={state.anchor} metrics={state.metrics} />}
    </Box>
  );
};

const LatestMonth: FC<{ supply: SupplyResponse; anchor: CalendarMonth; metrics: SupplyEnergyMetricsResponse }> = ({
  supply,
  anchor,
  metrics,
}) => {
  const resolution = resolvePeriod(anchor, { kind: "latest" });
  const plant = supply.plant;
  return (
    <>
      {resolution.status === "ok" && <PeriodHeader anchor={anchor} resolution={resolution} />}
      {plant && <NeutralNotice>{plantSupplyNotice(supply.name ?? supply.code, plant.name)}</NeutralNotice>}
      <PeriodUsageCard metrics={metrics} />
      {/* Stated from the response's own coverage, never inferred from the figures. */}
      {metrics.coverage.hoursWithData < metrics.coverage.expectedHours && <NeutralNotice>{INCOMPLETE_DATA}</NeutralNotice>}
      <PeriodTotals metrics={metrics} isPlantSupply={!!plant} />
    </>
  );
};
