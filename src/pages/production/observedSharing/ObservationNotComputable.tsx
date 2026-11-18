import type { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import type { PlantResponse } from "../../../api/models";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";
import { ObservationChip } from "./ObservationChip";

const panelSx = { ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 2 } as const;

/**
 * The plant supply has no data: nothing can be observed, so no agreement is
 * shown and no recommendation is made. No reason is given for the missing
 * data (UI-AGR-028).
 */
export const ObservationNotComputable: FC<{ plant: PlantResponse }> = ({ plant }) => (
  <Box sx={sxStyles.pageContainer}>
    <Box sx={{ ...panelSx, alignItems: "center", textAlign: "center", py: { xs: 3, sm: 5 } }}>
      <CloudOffRoundedIcon aria-hidden sx={{ fontSize: 48, color: colors.text.muted }} />
      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        No se puede calcular el reparto observado
      </Typography>
      <Typography sx={{ maxWidth: 560, color: colors.text.body }}>
        Sin la energía que vierte la planta no se puede saber qué parte recibió cada punto, así que no se calcula la
        observación de ningún acuerdo.
      </Typography>
      <Box
        sx={{
          width: "100%",
          maxWidth: 560,
          boxSizing: "border-box",
          bgcolor: colors.background.surface,
          borderRadius: 1,
          px: 2,
          py: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          textAlign: "left",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Punto de la planta
          </Typography>
          <ObservationChip label="Sin datos" tone="neutral" />
        </Box>
        <Typography variant="body2" sx={{ color: colors.text.subtle, overflowWrap: "anywhere" }}>
          {plant.supply.code}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          El punto de suministro de la planta no tiene datos de Datadis.
        </Typography>
      </Box>
      {plant.capabilities.canReadSupply && (
        <Button variant="contained" component={RouterLink} to={`/supply-points/${plant.supply.id}`}>
          Ver el punto de la planta
        </Button>
      )}
    </Box>
  </Box>
);
