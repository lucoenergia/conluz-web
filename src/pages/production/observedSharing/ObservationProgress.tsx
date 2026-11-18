import type { FC } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";

/** While the analysis computes: no figure, since none is known yet. */
export const ObservationProgress: FC = () => (
  <Box sx={sxStyles.pageContainer}>
    <Box sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography sx={{ fontWeight: 600 }}>Calculando el reparto observado…</Typography>
      <LinearProgress aria-label="Calculando el reparto observado" />
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        Analizando los datos de Datadis. Puede tardar unos segundos; puedes seguir usando Conluz mientras tanto.
      </Typography>
    </Box>
  </Box>
);
