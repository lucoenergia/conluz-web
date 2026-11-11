import type { FC, ReactNode } from "react";
import { Box, Chip, Typography } from "@mui/material";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import type { CommunityEnergyMetricsResponse } from "../../api/models";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { colors } from "../../theme/tokens";
import { formatEuros, formatMass } from "../../utils/formatEnergyFigures";
import { formatKilowattsPeak } from "../../utils/formatKilowatts";
import { HomeCard } from "../home/HomeCard";
import { NO_DATA, co2FactorText, unpricedSurplusText } from "./communityFigureTexts";

export const FIGURES_TITLE = "En cifras";
export const INCOME_LABEL = "Ingreso estimado por la energía que se fue a la red";
export const ESTIMATE_LABEL = "Estimación · precio del mercado eléctrico";
export const NEGATIVE_PRICES_TEXT = "El mercado eléctrico puede tener precios negativos, así que el ingreso estimado puede ser negativo.";
export const CO2_LABEL = "CO₂ evitado";
export const INSTALLED_POWER_LABEL = "Potencia instalada";




const Figure: FC<{ label: string; value: string; children?: ReactNode }> = ({ label, value, children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75, minWidth: 0 }}>
    <Typography variant="body2" sx={{ color: colors.text.body }}>
      {label}
    </Typography>
    <Typography variant="h5" component="p" sx={{ fontWeight: 700, color: colors.text.primary, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
    {children}
  </Box>
);

/**
 * The period's other figures (#403): what the exported energy would have
 * earned at market price, an estimate that may be negative and that leaves
 * out the energy no price covers (UI-CAN-005); the CO₂ avoided, with the
 * factor and its years (UI-CAN-006); and the installed power. All of them the
 * response's own; a null one reads "Sin datos".
 */
export const CommunityFigures: FC<{ metrics: CommunityEnergyMetricsResponse }> = ({ metrics }) => {
  const { surplusIncome, co2Avoided, installedPowerKWp } = metrics;
  const unpriced = surplusIncome.unpricedSurplusKWh;
  return (
    <HomeCard title={FIGURES_TITLE} icon={InsightsRoundedIcon}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" }, gap: 3 }}>
        <Figure label={INCOME_LABEL} value={surplusIncome.amountEur === null ? NO_DATA : formatEuros(surplusIncome.amountEur)}>
          <Chip size="small" label={ESTIMATE_LABEL} sx={{ bgcolor: colors.background.surface, color: colors.text.body }} />
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {NEGATIVE_PRICES_TEXT}
          </Typography>
          {unpriced !== null && unpriced > 0 && <NeutralNotice>{unpricedSurplusText(unpriced)}</NeutralNotice>}
        </Figure>
        <Figure label={CO2_LABEL} value={co2Avoided.amountKg === null ? NO_DATA : formatMass(co2Avoided.amountKg)}>
          {co2Avoided.amountKg !== null && co2Avoided.factorYears && co2Avoided.factorYears.length > 0 && (
            <Typography variant="body2" sx={{ color: colors.text.secondary }}>
              {co2FactorText(co2Avoided.factorYears)}
            </Typography>
          )}
        </Figure>
        <Figure label={INSTALLED_POWER_LABEL} value={formatKilowattsPeak(installedPowerKWp)} />
      </Box>
    </HomeCard>
  );
};
