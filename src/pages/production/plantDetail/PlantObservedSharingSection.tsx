import type { FC } from "react";
import { Box, Button } from "@mui/material";
import { Link as RouterLink } from "react-router";
import type { PlantResponse } from "../../../api/models";
import { observedSharingPath } from "../observedSharing/observedSharingRoutes";
import { PlantSection } from "../../../components/PlantSection";
import { PLANT_SECTION_IDS } from "./plantSections";
import { OBSERVED_SHARING_ICON } from "./sectionIcons";

/**
 * The way to the plant's observed sharing. It shows no figure from the
 * analysis and asks for nothing: the analysis is requested only from its own
 * pages (#418). Mounted only for a caller who may list the plant's agreements,
 * the requirement of the page it leads to.
 */
export const PlantObservedSharingSection: FC<{ plant: PlantResponse }> = ({ plant }) => (
  <PlantSection
    id={PLANT_SECTION_IDS.observedSharing}
    title="Reparto observado"
    description="Datadis muestra cómo se ha repartido de verdad la energía de esta planta. Compáralo con lo registrado."
    icon={OBSERVED_SHARING_ICON}
  >
    <Box sx={{ mt: 2 }}>
      <Button variant="contained" component={RouterLink} to={observedSharingPath(plant.id)}>
        Ver comparación
      </Button>
    </Box>
  </PlantSection>
);
