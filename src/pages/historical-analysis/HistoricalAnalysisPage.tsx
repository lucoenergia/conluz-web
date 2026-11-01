import { useEffect, type FC } from "react";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { ActionStatus } from "../../components/ActionStatus/ActionStatus";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { Notice } from "../../components/Notice/Notice";
import { NeutralNotice } from "../home/NeutralNotice";
import { HistoricalPeriodContext } from "./HistoricalPeriodContext";
import { PeriodHeader } from "./PeriodHeader";
import { PeriodSelector } from "./PeriodSelector";
import { SupplySelector } from "./SupplySelector";
import { useHistoricalAnchor, type HistoricalAnchor } from "./useHistoricalAnchor";
import { useHistoricalPeriodState, type HistoricalPeriodState } from "./useHistoricalPeriodState";
import { useOwnSupplies } from "./useOwnSupplies";
import { useSelectedSupply } from "./useSelectedSupply";

/**
 * "Mi consumo y ahorro": the caller's own supplies over time (#247). This
 * holds the supply selector and the period, anchored to the latest month
 * published for the selected scope (#248); the figures come in later issues
 * of lucoenergia/conluz#405, in the content region below it, which reads the
 * period through `useHistoricalPeriod`.
 */
export const HistoricalAnalysisPage: FC = () => {
  const { supplies, isLoading, error } = useOwnSupplies();
  const { selected, select } = useSelectedSupply(supplies);
  const anchor = useHistoricalAnchor(selected);
  const period = useHistoricalPeriodState(anchor, selected);
  const errorDispatch = useErrorDispatch();

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar tus puntos de suministro. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
        Mi consumo y ahorro
      </Typography>
      {isLoading && <Skeleton variant="rounded" height={56} sx={{ maxWidth: 560 }} />}
      {supplies?.length === 0 && <NeutralNotice>No tienes puntos de suministro en esta comunidad</NeutralNotice>}
      {supplies && supplies.length > 0 && (
        <>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <SupplySelector supplies={supplies} selected={selected} onSelect={select} />
            </Box>
            {anchor.status === "loading" && <Skeleton variant="rounded" height={56} sx={{ flex: 1, width: "100%" }} />}
            {anchor.status === "ready" && (
              <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                <PeriodSelector anchor={anchor.anchor} selection={period.selection} onSelect={period.select} />
              </Box>
            )}
          </Box>
          {/* Mounted before the anchor resolves, so a clamp the page arrives with is announced. */}
          <ActionStatus message={period.clampNotice} />
          <AnchoredContent anchor={anchor} period={period} />
        </>
      )}
    </Box>
  );
};

const NO_DATA_TITLE = "Todavía no hay datos publicados";
const NO_DATA_BODY =
  "La distribuidora publica los datos de cada mes hacia el día 10 del mes siguiente. Los verás aquí en cuanto se publique tu primer mes.";
const ANCHOR_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";

const YEAR_EMPTY_BODY = "Los datos de enero se publican hacia el 10 de febrero. Mientras tanto, puedes ver tus últimos 12 meses.";

/** What hangs off the latest published month of the selected scope (UI-HIS-005). */
const AnchoredContent: FC<{ anchor: HistoricalAnchor; period: HistoricalPeriodState }> = ({ anchor, period }) => {
  switch (anchor.status) {
    case "loading":
      return null;
    case "error":
      return <LoadErrorAlert message={ANCHOR_ERROR} onRetry={anchor.retry} />;
    case "none":
      // Neutral, not a failure: nothing is published yet for this scope.
      return <NeutralNotice title={NO_DATA_TITLE}>{NO_DATA_BODY}</NeutralNotice>;
    case "ready": {
      const { resolution } = period;
      const resolved = resolution?.status === "ok" ? resolution : null;
      return (
        <>
          {period.clampNotice && <Notice severity="info">{period.clampNotice}</Notice>}
          {resolution?.status === "yearEmpty" && (
            // Neutral, not a failure: an ordinary few weeks of every year.
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1.5 }}>
              <NeutralNotice title={`Aún no hay datos de ${resolution.year}`}>{YEAR_EMPTY_BODY}</NeutralNotice>
              <Button variant="outlined" onClick={() => period.select({ kind: "last12" })}>
                Ver últimos 12 meses
              </Button>
            </Box>
          )}
          {resolved && <PeriodHeader anchor={anchor.anchor} resolution={resolved} />}
          <HistoricalPeriodContext.Provider value={resolved?.period}>
            {/* The content region the figures land in. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }} />
          </HistoricalPeriodContext.Provider>
        </>
      );
    }
  }
};
