import type { FC } from "react";
import { Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router";
import type { PlantResponse } from "../../../api/models";
import { surplusClaimPath } from "../surplusClaim/surplusClaimRoutes";
import { PlantSection } from "../../../components/PlantSection";
import { PLANT_SECTION_IDS } from "./plantSections";
import { SURPLUS_CLAIM_ICON } from "./sectionIcons";

/**
 * The way to the plant's surplus claim. It shows no figure from the claim and
 * asks for nothing: the claim is requested only from its own page (#455).
 * Mounted only for a caller who may manage the plant, the requirement of the
 * page it leads to.
 */
export const PlantSurplusClaimSection: FC<{ plant: PlantResponse }> = ({
  plant,
}) => (
  <PlantSection
    id={PLANT_SECTION_IDS.surplusClaim}
    title="Reclamación de excedentes"
    description="Revisa el mes y descarga el fichero para la comercializadora."
    icon={SURPLUS_CLAIM_ICON}
  >
    <Box sx={{ mt: 2 }}>
      <Button
        variant="contained"
        component={RouterLink}
        to={surplusClaimPath(plant.id)}
      >
        Revisar y descargar
      </Button>
    </Box>
  </PlantSection>
);
