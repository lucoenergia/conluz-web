import type { FC, ReactNode } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RemoveCircleOutlineRoundedIcon from "@mui/icons-material/RemoveCircleOutlineRounded";
import type { MembershipPaybackResponse } from "../../../api/models";
import { formatCalendarDate } from "../../../utils/formatCalendarDate";
import { formatEuros } from "../../../utils/formatEnergyFigures";
import { formatPercentage } from "../../../utils/formatPercentage";
import { pluralize } from "../../../utils/pluralize";
import { colors, radii } from "../../../theme/tokens";
import { SAVINGS_COLOR } from "./energyColors";
import { EstimatedPriceLabel } from "./EstimatedPriceLabel";
import { HomeCard } from "../HomeCard";

const TITLE = "Recuperación de tu inversión";

const wholePercent = (ratio: number) => formatPercentage(ratio, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const BAR_HEIGHT = 12;

const Body: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="body2" sx={{ color: colors.text.body }}>
    {children}
  </Typography>
);

/** An ordinary state of the data, said plainly: neutral colours, and no role that would announce it as a notice. */
const QuietPanel: FC<{ children: ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: "flex",
      gap: 1,
      p: 1.5,
      borderRadius: radii.default,
      bgcolor: colors.background.surface,
      border: `1px solid ${colors.border.light}`,
    }}
  >
    <RemoveCircleOutlineRoundedIcon aria-hidden fontSize="small" sx={{ color: colors.text.subtle, mt: 0.25 }} />
    <Body>{children}</Body>
  </Box>
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
      <HomeCard title={TITLE} icon={AccountBalanceWalletRoundedIcon}>
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

  if (investmentEur === null || progressRatio === null) {
    return (
      <HomeCard title={TITLE} icon={AccountBalanceWalletRoundedIcon}>
        {saved}
        <QuietPanel>
          No consta ninguna inversión tuya registrada en esta comunidad, así que no se puede calcular cuánto llevas recuperado.
        </QuietPanel>
        <EstimatedPriceLabel estimatedPrice={estimatedPrice} />
      </HomeCard>
    );
  }

  const recovered = progressRatio >= 1;
  // The share is the block's figure only once there is something to show. A
  // share that reads "0 %" stays in its sentence at body size: drawn large and
  // green on a member's first months, it would only underline that nothing is
  // recovered yet. Keyed on what would be displayed, so a sliver that rounds
  // to 0 % is treated the same.
  const showsFigure = Math.round(progressRatio * 100) > 0;
  return (
    <HomeCard title={TITLE} icon={AccountBalanceWalletRoundedIcon}>
      {showsFigure && (
        <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 1 }}>
          <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: SAVINGS_COLOR }}>
            {wholePercent(progressRatio)}
          </Typography>
          <Typography variant="body1" sx={{ color: colors.text.body }}>
            recuperado
          </Typography>
        </Box>
      )}
      <Box>
        {recovered ? (
          // Full, and drawn only: there is no progress left to report, and the sentence below says so.
          <Box aria-hidden sx={{ height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, bgcolor: SAVINGS_COLOR }} />
        ) : (
          <LinearProgress
            variant="determinate"
            value={progressRatio * 100}
            aria-label="Parte recuperada de tu inversión"
            sx={{
              height: BAR_HEIGHT,
              borderRadius: BAR_HEIGHT / 2,
              bgcolor: colors.border.light,
              "& .MuiLinearProgress-bar": { bgcolor: SAVINGS_COLOR, borderRadius: BAR_HEIGHT / 2 },
            }}
          />
        )}
        {/* The bar's ends, in euros; the sentences below state both figures for assistive technology. */}
        <Box aria-hidden sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
            {formatEuros(0)}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
            {formatEuros(investmentEur)}
          </Typography>
        </Box>
      </Box>
      {saved}
      {recovered ? (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <CheckCircleRoundedIcon aria-hidden sx={{ color: SAVINGS_COLOR }} />
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
        </Box>
      ) : (
        <>
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
