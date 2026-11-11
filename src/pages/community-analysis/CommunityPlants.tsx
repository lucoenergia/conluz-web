import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import type { CommunityPlantEnergyResponse } from "../../api/models";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors, radii } from "../../theme/tokens";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { formatKilowattsPeak } from "../../utils/formatKilowatts";
import { HomeCard } from "../home/HomeCard";
import { sharePercent } from "./communityFigureTexts";

export const PLANTS_TITLE = "Plantas";
export const PLANTS_LIST_LABEL = "Plantas de la comunidad";
export const PLANT_NO_DATA = "Sin datos en este periodo";
export const NO_PLANTS_TITLE = "Esta comunidad todavía no tiene plantas";
export const NO_PLANTS_BODY = "Cuando la comunidad añada su primera planta, aquí verás cuánta energía produce.";

const PlantRow: FC<{ plant: CommunityPlantEnergyResponse }> = ({ plant: { plant, installedPowerKWp, productionKWh, productionShare } }) => (
  <Box component="li" sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1.75, borderTop: `1px solid ${colors.divider}` }}>
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
      <Typography variant="body1" component="h3" sx={{ flex: 1, minWidth: 0, fontWeight: 600, color: colors.text.primary, overflowWrap: "anywhere" }}>
        {plant.name}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.text.secondary, whiteSpace: "nowrap" }}>
        {formatKilowattsPeak(installedPowerKWp)}
      </Typography>
    </Box>
    {productionKWh === null ? (
      // A plant that stored nothing is not a plant that produced 0 (UI-CAN-008).
      <Typography variant="body2" sx={{ color: colors.text.secondary }}>
        {PLANT_NO_DATA}
      </Typography>
    ) : (
      <Typography variant="body1" sx={{ fontWeight: 700, color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
        {formatKilowattHours(productionKWh)}
      </Typography>
    )}
    {productionShare !== null && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        {/* The track is background.default, so the gold bar keeps 3:1 against it (UI-CAN-009). */}
        <Box aria-hidden sx={{ flex: 1, height: 6, borderRadius: radii.small, overflow: "hidden", bgcolor: colors.background.default }}>
          <Box sx={{ height: "100%", width: `${Math.min(Math.max(productionShare, 0), 1) * 100}%`, bgcolor: ENERGY_COLORS.assigned }} />
        </Box>
        <Typography variant="body2" sx={{ flex: "none", color: colors.text.body, fontVariantNumeric: "tabular-nums" }}>
          {sharePercent(productionShare)} del total
        </Typography>
      </Box>
    )}
  </Box>
);

/**
 * The community's plants over the period (#403): each one's installed power,
 * its production and its share of the total, all from the response
 * (UI-CAN-008). Rows are not links: the plant detail is for admins.
 */
export const CommunityPlants: FC<{ plants: CommunityPlantEnergyResponse[] }> = ({ plants }) => (
  <HomeCard title={PLANTS_TITLE} icon={SolarPowerIcon}>
    {plants.length === 0 ? (
      <NeutralNotice title={NO_PLANTS_TITLE}>{NO_PLANTS_BODY}</NeutralNotice>
    ) : (
      <Box component="ul" aria-label={PLANTS_LIST_LABEL} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {plants.map((plant) => (
          <PlantRow key={plant.plant.id} plant={plant} />
        ))}
      </Box>
    )}
  </HomeCard>
);
