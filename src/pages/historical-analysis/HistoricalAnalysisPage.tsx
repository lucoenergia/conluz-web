import { useEffect, type FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { NeutralNotice } from "../home/NeutralNotice";
import { SupplySelector } from "./SupplySelector";
import { useHistoricalAnchor, type HistoricalAnchor } from "./useHistoricalAnchor";
import { useOwnSupplies } from "./useOwnSupplies";
import { useSelectedSupply } from "./useSelectedSupply";

/**
 * "Mi consumo y ahorro": the caller's own supplies over time (#247). This
 * holds the supply selector and the period, anchored to the latest month
 * published for the selected scope (#248); the figures come in later issues
 * of lucoenergia/conluz#405, in the content region below it.
 */
export const HistoricalAnalysisPage: FC = () => {
  const { supplies, isLoading, error } = useOwnSupplies();
  const { selected, select } = useSelectedSupply(supplies);
  const anchor = useHistoricalAnchor(selected);
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
          <SupplySelector supplies={supplies} selected={selected} onSelect={select} />
          <AnchoredContent anchor={anchor} />
        </>
      )}
    </Box>
  );
};

export const NO_DATA_TITLE = "Todavía no hay datos publicados";
export const NO_DATA_BODY =
  "La distribuidora publica los datos de cada mes hacia el día 10 del mes siguiente. Los verás aquí en cuanto se publique tu primer mes.";
export const ANCHOR_ERROR = "No se pudieron cargar tus datos de energía. Comprueba tu conexión e inténtalo de nuevo.";

/** What hangs off the latest published month of the selected scope (UI-HIS-005). */
const AnchoredContent: FC<{ anchor: HistoricalAnchor }> = ({ anchor }) => {
  switch (anchor.status) {
    case "loading":
      return <Skeleton variant="rounded" height={56} sx={{ maxWidth: 560 }} />;
    case "error":
      return <LoadErrorAlert message={ANCHOR_ERROR} onRetry={anchor.retry} />;
    case "none":
      // Neutral, not a failure: nothing is published yet for this scope.
      return <NeutralNotice title={NO_DATA_TITLE}>{NO_DATA_BODY}</NeutralNotice>;
    case "ready":
      // The content region the period and figures land in.
      return <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }} />;
  }
};
