import type { FC } from "react";
import { Box, Skeleton } from "@mui/material";
import type { SupplyResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { NeutralNotice } from "../home/NeutralNotice";
import { useHistoricalPeriod } from "./HistoricalPeriodContext";
import { PeriodTotals } from "./PeriodTotals";
import { PeriodUsageCard } from "./PeriodUsageCard";
import { plantSupplyNotice } from "./periodUsage";
import { usePeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

const LOADING_LABEL = "Cargando tus datos…";
const LOAD_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";
const INCOMPLETE_DATA = "Faltan datos de parte de este periodo: las cifras suman solo los datos disponibles.";

/**
 * The figures of the selected period and scope (#249): the period card, with
 * what qualifies it, and the totals. Nothing renders, and nothing is fetched,
 * until the period is known.
 */
export const PeriodFigures: FC<{ selected: SupplyResponse | null }> = ({ selected }) => {
  const period = useHistoricalPeriod();
  const state = usePeriodEnergyMetrics(selected);
  if (!period) return null;

  const plant = selected?.plant;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {selected && plant && <NeutralNotice>{plantSupplyNotice(selected.name ?? selected.code, plant.name)}</NeutralNotice>}
      {state.status === "loading" && <Skeleton variant="rounded" height={280} role="progressbar" aria-label={LOADING_LABEL} />}
      {state.status === "error" && <LoadErrorAlert message={LOAD_ERROR} onRetry={state.retry} />}
      {state.status === "ready" && (
        <>
          <PeriodUsageCard metrics={state.metrics} />
          {/* Stated from the response's own coverage, never inferred from the figures. */}
          {state.metrics.coverage.hoursWithData < state.metrics.coverage.expectedHours && <NeutralNotice>{INCOMPLETE_DATA}</NeutralNotice>}
          <PeriodTotals metrics={state.metrics} isPlantSupply={!!plant} />
        </>
      )}
    </Box>
  );
};
