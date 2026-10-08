import { useId, type FC } from "react";
import { Box, Typography } from "@mui/material";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { formatPercentage } from "../../../utils/formatPercentage";
import { colors, radii } from "../../../theme/tokens";
import { ENERGY_COLORS, swatch, type SwatchStyle } from "./energyColors";
import { HomeCard } from "../HomeCard";

const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const SHARED = swatch.solid(ENERGY_COLORS.community);

interface Segment {
  label: string;
  kWh: number;
  swatch: SwatchStyle;
}

/**
 * One bar of the journey. Both bars share the community segment -- the energy
 * the member used -- but each is a share of a different total, so each
 * states its own base beside its title. Without it the two green lengths
 * invite a comparison that means nothing.
 *
 * The split comes from the backend's ratio, not from dividing totals here.
 */
const JourneyBar: FC<{ title: string; base: string; ratio: number; shared: Segment; rest: Segment }> = ({
  title,
  base,
  ratio,
  shared,
  rest,
}) => (
  <Box>
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 1, mb: 0.75 }}>
      <Typography variant="body1" component="h3" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        {base}
      </Typography>
    </Box>
    <Box aria-hidden sx={{ display: "flex", height: 20, borderRadius: radii.small, overflow: "hidden", ...rest.swatch }}>
      <Box
        sx={{
          width: `${ratio * 100}%`,
          ...shared.swatch,
          // A white edge where the two segments meet, so neither relies on its neighbour's colour.
          ...(ratio > 0 && ratio < 1 && { borderRight: `2px solid ${colors.background.paper}` }),
        }}
      />
    </Box>
    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mt: 1, display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 0.5 }}>
      {[
        { ...shared, share: ratio },
        { ...rest, share: 1 - ratio },
      ].map((segment) => (
        <Box component="li" key={segment.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: radii.small, flexShrink: 0, boxSizing: "border-box", ...segment.swatch }} />
          <Typography variant="body2" sx={{ color: colors.text.body }}>
            {segment.label}: <strong>{formatKilowattHours(segment.kWh)}</strong> ({wholePercent(segment.share)})
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);

const Unavailable: FC<{ title: string; reason: string }> = ({ title, reason }) => (
  <Box>
    <Typography variant="body1" component="h3" sx={{ fontWeight: 600, color: colors.text.primary }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: colors.text.subtle }}>
      {reason}
    </Typography>
  </Box>
);

/**
 * The figure the page leads with (#231): the share of the assigned energy the
 * member used, and the kWh it stands for. Nothing else belongs here -- no
 * reading of the figure, no direction, no promise that it can rise. Whether
 * there is anything to do is the advice's to say, under its own rules.
 */
const PrimaryFigure: FC<{ ratio: number; usedKWh: number; assignedKWh: number }> = ({ ratio, usedKWh, assignedKWh }) => {
  const labelId = useId();
  return (
    <Box role="group" aria-labelledby={labelId} sx={{ pb: 2, borderBottom: `1px solid ${colors.border.light}` }}>
      <Typography id={labelId} variant="h6" component="p" sx={{ color: colors.text.primary }}>
        Energía asignada que usaste
      </Typography>
      <Typography
        variant="h2"
        component="p"
        sx={(theme) => ({
          [theme.breakpoints.up("sm")]: { fontSize: theme.typography.h1.fontSize },
          fontWeight: 700,
          lineHeight: 1.1,
          color: colors.success.main,
        })}
      >
        {wholePercent(ratio)}
      </Typography>
      <Typography variant="h6" component="p" sx={{ fontWeight: 400, color: colors.text.body }}>
        {formatKilowattHours(usedKWh)} de {formatKilowattHours(assignedKWh)}
      </Typography>
    </Box>
  );
};

/** The two-bar story: where the energy assigned to the member went, and where their consumption came from. */
export const EnergyJourney: FC<{ metrics: MembershipEnergyMetricsResponse }> = ({ metrics }) => {
  const { energy, selfConsumptionRatio, selfSufficiencyRatio } = metrics;
  return (
    <HomeCard title="El recorrido de tu energía" icon={RouteRoundedIcon} variant="primary">
      {selfConsumptionRatio !== null && (
        <PrimaryFigure
          ratio={selfConsumptionRatio}
          usedKWh={energy.selfConsumptionKWh}
          assignedKWh={energy.assignedProductionKWh}
        />
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
        {selfConsumptionRatio === null ? (
          <Unavailable title="La energía que se te asignó" reason="Este mes no se te asignó energía de la comunidad." />
        ) : (
          <JourneyBar
            title="La energía que se te asignó"
            base={`de ${formatKilowattHours(energy.assignedProductionKWh)} asignados`}
            ratio={selfConsumptionRatio}
            shared={{ label: "La usaste tú", kWh: energy.selfConsumptionKWh, swatch: SHARED }}
            rest={{ label: "Se fue a la red", kWh: energy.surplusKWh, swatch: swatch.exported }}
          />
        )}
        {selfSufficiencyRatio === null ? (
          <Unavailable title="Tu consumo" reason="Este mes no consta consumo en tus puntos de suministro." />
        ) : (
          <JourneyBar
            title="Tu consumo"
            base={`de ${formatKilowattHours(energy.totalConsumptionKWh)} consumidos`}
            ratio={selfSufficiencyRatio}
            shared={{ label: "De la comunidad", kWh: energy.selfConsumptionKWh, swatch: SHARED }}
            rest={{ label: "De la red", kWh: energy.gridImportKWh, swatch: swatch.solid(ENERGY_COLORS.grid) }}
          />
        )}
      </Box>
    </HomeCard>
  );
};
