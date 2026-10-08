import type { FC } from "react";
import { Typography } from "@mui/material";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { formatEuros, formatKilowattHours } from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";
import { SAVINGS_COLOR } from "./energyColors";
import { EstimatedPriceLabel } from "./EstimatedPriceLabel";
import { HomeCard } from "../HomeCard";

/** What the community energy the member used in the reference month was worth. */
export const SavingsCard: FC<{ metrics: MembershipEnergyMetricsResponse; month: string }> = ({ metrics, month }) => {
  const { amountEur, estimatedPrice } = metrics.savings;
  return (
    <HomeCard title={`Tu ahorro en ${month}`} icon={SavingsRoundedIcon}>
      {amountEur === null ? (
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Todavía no hay un mes con energía de la comunidad sobre el que calcular tu ahorro.
        </Typography>
      ) : (
        <>
          <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: SAVINGS_COLOR }}>
            {formatEuros(amountEur)}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.body }}>
            Por los {formatKilowattHours(metrics.energy.selfConsumptionKWh)} de la comunidad que consumiste en vez de
            comprarlos a la red.
          </Typography>
          <EstimatedPriceLabel estimatedPrice={estimatedPrice} />
        </>
      )}
    </HomeCard>
  );
};
