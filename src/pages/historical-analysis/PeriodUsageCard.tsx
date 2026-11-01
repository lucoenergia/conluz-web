import { useId, type FC, type ReactNode } from "react";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { formatKilowattHourAmount, formatKilowattHours } from "../../utils/formatEnergyFigures";
import { sxStyles } from "../../theme/sx";
import { colors, radii } from "../../theme/tokens";
import { ENERGY_COLORS } from "../home/member/energyColors";
import { boundedPercent, coverageSentence, excludedPlantsText, usageHeadline } from "./periodUsage";
import type { PeriodEnergyMetrics } from "./usePeriodEnergyMetrics";

const CAPTION = "De la energía que te tocó";
/** The one place the technical names of the two ratios appear (UI-HIS-011). */
const TECHNICAL_TERMS =
  "En términos técnicos, la primera cifra es tu porcentaje de autoconsumo y la segunda, tu porcentaje de autosuficiencia.";
const NOT_APPLICABLE_TITLE = "No aplica al punto de la planta";
const NOT_APPLICABLE_BODY = "En el punto de la planta, «se fue a la red» siempre es 0 kWh.";
const NOTHING_ASSIGNED_TITLE = "En este periodo no se te asignó energía";

/**
 * The period card (#249): one headline -- the share of the energy assigned to
 * the caller that they used -- and its consequence on their consumption, as a
 * sentence. Every figure is a field of the response (UI-HIS-010); which
 * headline shows is decided by `selfConsumptionRatioStatus`, never by a null
 * ratio (UI-HIS-013).
 */
export const PeriodUsageCard: FC<{ metrics: PeriodEnergyMetrics }> = ({ metrics }) => {
  const captionId = useId();
  const coverage = coverageSentence(metrics.selfSufficiencyRatio);

  return (
    <Box component="section" aria-labelledby={captionId} sx={{ ...sxStyles.softPanel, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography id={captionId} variant="body1" component="h3" sx={{ color: colors.text.secondary }}>
          {CAPTION}
        </Typography>
        <Tooltip title={TECHNICAL_TERMS} describeChild enterTouchDelay={0} leaveTouchDelay={6000}>
          <IconButton size="small" aria-label="Qué significan estas cifras" sx={{ color: colors.text.secondary }}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Usage metrics={metrics} />
      {coverage && metrics.selfSufficiencyRatio !== null && (
        <>
          <Divider sx={{ my: 2, borderColor: colors.divider }} />
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <HomeRoundedIcon aria-hidden sx={{ color: colors.text.primary, mt: 0.25 }} />
            <Box>
              <Typography variant="body1" sx={{ color: colors.text.primary }}>
                {coverage.lead}
                {coverage.fraction && (
                  <Box component="span" sx={{ fontWeight: 500, color: colors.success.main }}>
                    {coverage.fraction}
                  </Box>
                )}
                {coverage.tail}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                {consumptionDetail(metrics, metrics.selfSufficiencyRatio)}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

/** The upper half: the headline, its bar and its detail, or the neutral state that replaces them. */
const Usage: FC<{ metrics: PeriodEnergyMetrics }> = ({ metrics }) => {
  const { selfConsumptionRatioStatus: status, selfConsumptionRatio: ratio, selfConsumptionRatioBasis: basis } = metrics;

  if (status === "NOT_APPLICABLE") {
    return (
      <NeutralHeadline title={NOT_APPLICABLE_TITLE}>
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {NOT_APPLICABLE_BODY}
        </Typography>
      </NeutralHeadline>
    );
  }
  if (status === "NOTHING_ASSIGNED") return <NeutralHeadline title={NOTHING_ASSIGNED_TITLE} />;
  if (ratio === null) return null;

  // The bar's split is the only arithmetic on this card, and it is never shown as text.
  const used = basis.assignedProductionKWh > 0 ? Math.min(Math.max(basis.selfConsumptionKWh / basis.assignedProductionKWh, 0), 1) : 0;
  const rest = ratio === 1 ? "no se fue nada a la red" : "el resto se fue a la red";

  return (
    <>
      <Typography
        variant="h3"
        component="p"
        sx={{ typography: { xs: "h4", sm: "h3" }, fontWeight: 700, color: colors.success.main, fontVariantNumeric: "tabular-nums", mt: 0.25 }}
      >
        {usageHeadline(ratio)}
      </Typography>
      {/* The detail line below states the same split in words. */}
      <Box
        aria-hidden
        sx={{ display: "flex", height: 10, mt: 1.5, borderRadius: radii.small, overflow: "hidden", bgcolor: ENERGY_COLORS.exported }}
      >
        <Box
          sx={{
            width: `${used * 100}%`,
            bgcolor: ENERGY_COLORS.community,
            // A white edge where the two segments meet, so neither relies on its neighbour's colour.
            ...(used > 0 && used < 1 && { borderRight: `2px solid ${colors.background.paper}` }),
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: colors.text.body, mt: 1 }}>
        {formatKilowattHourAmount(basis.selfConsumptionKWh)} de {formatKilowattHours(basis.assignedProductionKWh)} · {rest}
      </Typography>
      {status === "AVAILABLE" && basis.excludedPlantSupplyCount > 0 && (
        <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 0.5 }}>
          {excludedPlantsText(basis.excludedPlantSupplyCount)}
        </Typography>
      )}
    </>
  );
};

/** A state that replaces the headline: plain type, never an alert colour. */
const NeutralHeadline: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => (
  <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
    <Typography variant="h6" component="p" sx={{ fontWeight: 600, color: colors.text.primary }}>
      {title}
    </Typography>
    {children}
  </Box>
);

/** "135 de 399 kWh · 34 % · el resto lo compraste a la red", every figure from the response. */
function consumptionDetail({ energy }: PeriodEnergyMetrics, selfSufficiencyRatio: number): string {
  const head = `${formatKilowattHourAmount(energy.selfConsumptionKWh)} de ${formatKilowattHours(energy.totalConsumptionKWh)} · ${boundedPercent(selfSufficiencyRatio).text}`;
  if (selfSufficiencyRatio === 1) return head;
  return `${head} · ${selfSufficiencyRatio === 0 ? "todo lo compraste a la red" : "el resto lo compraste a la red"}`;
}
