import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import type { CommunityEnergyMetricsResponse } from "../../api/models";
import { ENERGY_COLORS } from "../../components/EnergyFigures/energyColors";
import { colors, radii } from "../../theme/tokens";
import { HomeCard } from "../home/HomeCard";
import { SELF_CONSUMPTION_SEGMENT, SURPLUS_SEGMENT } from "./communitySeries";
import { kilowattHoursOrNoData, wholePercent } from "./communityFigureTexts";

export const JOURNEY_TITLE = "El recorrido de la energía de la comunidad";
export const PRODUCTION_LABEL = "Las plantas produjeron";
export const SPLIT_LABEL = "Adónde fue la energía";

const Swatch: FC<{ color: string; size?: number }> = ({ color, size = 12 }) => (
  <Box aria-hidden sx={{ width: size, height: size, borderRadius: radii.small, flexShrink: 0, bgcolor: color }} />
);

/**
 * What the community's plants produced, and where the energy went (#403):
 * the production in `text.primary` beside a gold swatch, never gold type
 * (UI-CAN-009), and the split into what the community used and what went to
 * the grid. Every figure and both percentages are the response's own: the
 * client divides nothing (UI-CAN-003). The production's gold and the
 * self-consumption green never share the split's bar or its legend.
 */
export const CommunityJourney: FC<{ metrics: CommunityEnergyMetricsResponse }> = ({ metrics }) => {
  const { energy, selfConsumptionRatio, surplusRatio } = metrics;
  const split = [
    { label: SELF_CONSUMPTION_SEGMENT, color: ENERGY_COLORS.community, kWh: energy.selfConsumptionKWh, ratio: selfConsumptionRatio },
    { label: SURPLUS_SEGMENT, color: ENERGY_COLORS.exported, kWh: energy.surplusKWh, ratio: surplusRatio },
  ];
  return (
    <HomeCard title={JOURNEY_TITLE} icon={RouteRoundedIcon}>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Swatch color={ENERGY_COLORS.assigned} />
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {PRODUCTION_LABEL}
          </Typography>
        </Box>
        <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
          {kilowattHoursOrNoData(energy.productionKWh)}
        </Typography>
      </Box>
      {selfConsumptionRatio !== null && surplusRatio !== null && (
        <Box
          role="img"
          aria-label={`${wholePercent(selfConsumptionRatio)} se usó en la comunidad y ${wholePercent(surplusRatio)} se fue a la red`}
          sx={{ display: "flex", gap: "2px", height: 28, borderRadius: radii.default, overflow: "hidden" }}
        >
          {split.map(({ label, color, ratio }) => (
            <Box key={label} sx={{ flex: `${ratio} 0 0`, bgcolor: color }} />
          ))}
        </Box>
      )}
      <Box component="ul" aria-label={SPLIT_LABEL} sx={{ listStyle: "none", p: 0, m: 0 }}>
        {split.map(({ label, color, kWh, ratio }, index) => (
          <Box
            component="li"
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1.5, borderBottom: index === 0 ? `1px solid ${colors.divider}` : "none" }}
          >
            <Swatch color={color} size={14} />
            <Typography variant="body1" sx={{ flex: 1, minWidth: 0, color: colors.text.primary }}>
              {label}
            </Typography>
            <Box sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: colors.text.primary }}>
                {kilowattHoursOrNoData(kWh)}
              </Typography>
              {ratio !== null && (
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  {wholePercent(ratio)}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </HomeCard>
  );
};
