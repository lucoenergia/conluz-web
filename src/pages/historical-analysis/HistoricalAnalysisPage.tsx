import { useEffect, type FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useErrorDispatch } from "../../context/error.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { NeutralNotice } from "../home/NeutralNotice";
import { SupplySelector } from "./SupplySelector";
import { useOwnSupplies } from "./useOwnSupplies";
import { useSelectedSupply } from "./useSelectedSupply";

/**
 * "Mi consumo y ahorro": the caller's own supplies over time (#247). This
 * holds the supply selector; the period and the figures come in later issues
 * of lucoenergia/conluz#405, in the content region below it.
 */
export const HistoricalAnalysisPage: FC = () => {
  const { supplies, isLoading, error } = useOwnSupplies();
  const { selected, select } = useSelectedSupply(supplies);
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
          {/* The content region the period and figures land in (#248 onwards). */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }} />
        </>
      )}
    </Box>
  );
};
