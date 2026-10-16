import type { FC } from "react";
import { Box, Button } from "@mui/material";
import { NextStepBanner } from "../../../components/NextStepBanner";
import { colors } from "../../../theme/tokens";
import { PLANT_SECTION_IDS, scrollToSection } from "./plantSections";
import type { PlantIntegrationStatus } from "./usePlantIntegrationStatus";

const STEPS: Partial<Record<PlantIntegrationStatus, { headline: string; action: string }>> = {
  "not-configured": {
    headline: "Configura la integración con Huawei para recibir la producción de esta planta.",
    action: "Configurar integración",
  },
  // A configuration is created disabled (UI-INT-008), so this is the last step
  // of a normal setup, not something an admin chose to stop.
  disabled: {
    headline: "Activa la integración con Huawei para que la producción de esta planta empiece a sincronizarse.",
    action: "Activar integración",
  },
};

/**
 * The integration's next step, at the top of the plant detail, while it is not
 * configured or not enabled (UI-PLT-004). Its status is only known to a caller
 * who may manage the plant, so it never shows for anyone else.
 *
 * The action only takes the admin to the integrations section: configuring
 * and enabling stay there, with UI-INT-009's confirmation.
 */
export const PlantNextStep: FC<{ integrationStatus: PlantIntegrationStatus }> = ({ integrationStatus }) => {
  const step = STEPS[integrationStatus];
  if (!step) return null;

  return (
    <Box component="section" aria-label="Siguiente paso">
      <NextStepBanner headline={step.headline}>
        {/* White on the brand card, as the agreement's next step has it. */}
        <Button
          variant="contained"
          disableElevation
          onClick={() => scrollToSection(PLANT_SECTION_IDS.integrations)}
          sx={{
            alignSelf: "flex-start",
            minHeight: 44,
            bgcolor: colors.background.paper,
            color: colors.brand.dark,
            "&:hover": { bgcolor: colors.brand.onSoft },
          }}
        >
          {step.action}
        </Button>
      </NextStepBanner>
    </Box>
  );
};
