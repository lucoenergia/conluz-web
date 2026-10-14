import { useId, type FC } from "react";
import { Box, Typography } from "@mui/material";
import type { PlantResponse } from "../../api/models";
import { usePlantActions } from "../../hooks/actions";
import { HuaweiIntegrationCard } from "./HuaweiIntegrationCard";

/**
 * The integrations of the plant on screen: today, Huawei (#192).
 *
 * Gated by the action itself: the configuration write is handed over only when
 * the plant's own `canManage` allows it, and without it nothing renders -- no
 * placeholder, no disabled control, and no read of the configuration
 * (UI-INT-006). The community's capabilities play no part.
 */
export const PlantIntegrationsSection: FC<{ plant: PlantResponse | undefined }> = ({ plant }) => {
  const titleId = useId();
  const { configureHuawei } = usePlantActions().forPlant(plant).actions;

  if (!plant || !configureHuawei) return null;

  return (
    <Box component="section" aria-labelledby={titleId} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography id={titleId} component="h2" variant="h6">
        Integraciones
      </Typography>
      <HuaweiIntegrationCard plantId={plant.id} configure={configureHuawei} />
    </Box>
  );
};
