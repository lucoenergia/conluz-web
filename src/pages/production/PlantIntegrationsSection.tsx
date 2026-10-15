import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { PlantResponse } from "../../api/models";
import { sxStyles } from "../../theme/sx";
import { usePlantActions } from "../../hooks/actions";
import { HuaweiIntegrationCard } from "./HuaweiIntegrationCard";
import { PLANT_SECTION_IDS, sectionHeadingId, sectionScrollMarginSx } from "./plantDetail/plantSections";

/**
 * The integrations of the plant on screen: today, Huawei (#192).
 *
 * Gated by the action itself: the configuration write is handed over only when
 * the plant's own `canManage` allows it, and without it nothing renders -- no
 * placeholder, no disabled control, and no read of the configuration
 * (UI-INT-006). The community's capabilities play no part.
 */
export const PlantIntegrationsSection: FC<{ plant: PlantResponse | undefined }> = ({ plant }) => {
  const titleId = sectionHeadingId(PLANT_SECTION_IDS.integrations);
  const { configureHuawei, enableHuawei, disableHuawei } = usePlantActions().forPlant(plant).actions;

  if (!plant || !configureHuawei || !enableHuawei || !disableHuawei) return null;

  return (
    <Box
      component="section"
      id={PLANT_SECTION_IDS.integrations}
      aria-labelledby={titleId}
      sx={[{ ...sxStyles.pageContainer, display: "flex", flexDirection: "column", gap: 2 }, sectionScrollMarginSx]}
    >
      {/* Focused from code after a jump here from the plant summary. */}
      <Typography
        id={titleId}
        component="h2"
        variant="h6"
        tabIndex={-1}
        sx={{ "&:focus:not(:focus-visible)": { outline: "none" } }}
      >
        Integraciones
      </Typography>
      <HuaweiIntegrationCard
        plantId={plant.id}
        configure={configureHuawei}
        enable={enableHuawei}
        disable={disableHuawei}
      />
    </Box>
  );
};
