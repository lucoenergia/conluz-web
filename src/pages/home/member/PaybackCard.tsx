import type { FC, ReactNode } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import type { MembershipPaybackResponse } from "../../../api/models";
import { formatCalendarDate } from "../../../utils/formatCalendarDate";
import { formatEuros } from "../../../utils/formatEnergyFigures";
import { formatPercentage } from "../../../utils/formatPercentage";
import { pluralize } from "../../../utils/pluralize";
import { colors } from "../../../theme/tokens";
import { EstimatedPriceLabel } from "./EstimatedPriceLabel";
import { HomeCard } from "./HomeCard";

const TITLE = "Recuperación de tu inversión";

const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const Body: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="body2" sx={{ color: colors.text.body }}>
    {children}
  </Typography>
);

/**
 * How far the member is from recovering what they contributed. Null and zero
 * mean different things here, so every null figure is explained in words and
 * never printed as 0.
 */
export const PaybackCard: FC<{ payback: MembershipPaybackResponse }> = ({ payback }) => {
  const { investmentEur, savedEur, progressRatio, remainingEur, estimatedRemainingMonths, startDate, estimatedPrice } =
    payback;

  // savedEur is null exactly when the community has never shared energy.
  if (savedEur === null) {
    return (
      <HomeCard title={TITLE}>
        <Body>
          Tu comunidad todavía no ha empezado a compartir energía, así que aún no hay ahorro acumulado.
          {investmentEur !== null && <> Tu inversión registrada es de {formatEuros(investmentEur)}.</>}
        </Body>
      </HomeCard>
    );
  }

  const saved = (
    <Body>
      Llevas ahorrados <strong>{formatEuros(savedEur)}</strong>
      {startDate && <> desde que la comunidad empezó a compartir energía, el {formatCalendarDate(startDate)}</>}.
    </Body>
  );

  return (
    <HomeCard title={TITLE}>
      {saved}
      {investmentEur === null || progressRatio === null ? (
        <Body>No consta ninguna inversión tuya registrada en esta comunidad, así que no se puede calcular cuánto llevas recuperado.</Body>
      ) : progressRatio >= 1 ? (
        <Body>
          Ya has recuperado tu inversión de {formatEuros(investmentEur)}
          {progressRatio > 1 && (
            <>
              {" "}y llevas <strong>{formatEuros(savedEur - investmentEur)}</strong> más de lo que aportaste (
              {wholePercent(progressRatio)} de la inversión)
            </>
          )}
          .
        </Body>
      ) : (
        <>
          <Box>
            <LinearProgress
              variant="determinate"
              value={progressRatio * 100}
              aria-label="Parte recuperada de tu inversión"
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
          <Body>
            Has recuperado el {wholePercent(progressRatio)} de tu inversión de {formatEuros(investmentEur)}
            {remainingEur !== null && <>; te faltan {formatEuros(remainingEur)}</>}.
          </Body>
          <Body>
            {estimatedRemainingMonths === null
              ? "Todavía no hay ahorro suficiente para estimar cuánto tardarás en recuperar el resto."
              : `Al ritmo de ahorro que llevas, tardarás unos ${estimatedRemainingMonths} ${pluralize(estimatedRemainingMonths, "mes", "meses")} más.`}
          </Body>
        </>
      )}
      <EstimatedPriceLabel estimatedPrice={estimatedPrice} />
    </HomeCard>
  );
};
