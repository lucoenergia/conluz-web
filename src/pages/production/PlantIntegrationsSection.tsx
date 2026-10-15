import type { FC } from "react";
import { Box } from "@mui/material";
import CableRoundedIcon from "@mui/icons-material/CableRounded";
import type { PlantResponse } from "../../api/models";
import { sxStyles } from "../../theme/sx";
import { usePlantActions } from "../../hooks/actions";
import { HuaweiIntegrationCard } from "./HuaweiIntegrationCard";
import { PlantSection } from "./plantDetail/PlantSection";
import { PLANT_SECTION_IDS } from "./plantDetail/plantSections";

/**
 * The integrations of the plant on screen: today, Huawei (#192).
 *
 * Gated by the action itself: the configuration write is handed over only when
 * the plant's own `canManage` allows it, and without it nothing renders -- no
 * placeholder, no disabled control, and no read of the configuration
 * (UI-INT-006). The community's capabilities play no part.
 *
 * The plant summary and the next step jump here, so the section carries their
 * anchor and its heading takes focus after the jump.
 */
export const PlantIntegrationsSection: FC<{ plant: PlantResponse | undefined }> = ({ plant }) => {
  const { configureHuawei, enableHuawei, disableHuawei } = usePlantActions().forPlant(plant).actions;

  if (!plant || !configureHuawei || !enableHuawei || !disableHuawei) return null;

  return (
    <Box sx={sxStyles.pageContainer}>
      <PlantSection
        id={PLANT_SECTION_IDS.integrations}
        title="Integraciones"
        description="De dónde llegan los datos de producción de esta planta."
        icon={CableRoundedIcon}
      >
        <HuaweiIntegrationCard
          plantId={plant.id}
          configure={configureHuawei}
          enable={enableHuawei}
          disable={disableHuawei}
        />
      </PlantSection>
    </Box>
  );
};
