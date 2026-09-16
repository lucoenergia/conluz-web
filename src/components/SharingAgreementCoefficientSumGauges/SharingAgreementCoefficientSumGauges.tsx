import type { FC } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { colors, fontSizes, radii } from "../../theme/tokens";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  formatCoefficientPercentage,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";

export interface SharingAgreementCoefficientSumGaugesProps {
  coefficients: CoefficientSummable[];
  agreementStatus: StatusValue | undefined;
}

type GaugeTone = "complete" | "short" | "over";

function toneFor(sumUnits: number): GaugeTone {
  if (isFullSum(sumUnits)) return "complete";
  return sumUnits > COEFFICIENT_SCALE ? "over" : "short";
}

/**
 * `vivid` for the bar, `main` for the figure: a filled bar is a graphic object and
 * clears its 3:1 bar at `vivid`, while the number beside it is type and needs 4.5:1.
 */
const TONE_COLORS: Record<GaugeTone, { fill: string; figure: string }> = {
  complete: { fill: colors.success.vivid, figure: colors.success.main },
  short: { fill: colors.info.vivid, figure: colors.text.primary },
  over: { fill: colors.error.vivid, figure: colors.error.main },
};

interface GaugeProps {
  label: string;
  sumUnits: number;
  tone: GaugeTone;
  caption?: string | null;
}

const Gauge: FC<GaugeProps> = ({ label, sumUnits, tone, caption }) => {
  const percentage = formatCoefficientPercentage(sumUnits / COEFFICIENT_SCALE);
  // The bar is capped so an over-100% set still reads as "full and then some"
  // rather than overflowing its track; the figure beside it stays exact.
  const barValue = Math.min(100, Math.max(0, (sumUnits / COEFFICIENT_SCALE) * 100));

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, mb: 0.75 }}>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSizes["2xl"],
            fontWeight: 700,
            color: TONE_COLORS[tone].figure,
            // Regulated figures are read against each other; proportional digits
            // make the decimals jitter between rows and renders.
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {percentage}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={barValue}
        aria-label={label}
        // The rounded bar value would announce "100%" for a set that is short by a
        // fraction of a percent. The exact figure is what the distributor validates.
        aria-valuetext={percentage}
        sx={{
          height: 8,
          borderRadius: radii.small,
          bgcolor: colors.border.light,
          "& .MuiLinearProgress-bar": {
            borderRadius: radii.small,
            bgcolor: TONE_COLORS[tone].fill,
          },
        }}
      />

      {caption && (
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: colors.text.subtle }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
};

export const SharingAgreementCoefficientSumGauges: FC<SharingAgreementCoefficientSumGaugesProps> = ({
  coefficients,
  agreementStatus,
}) => {
  const { fileSumUnits, appliedSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
  const isDraft = agreementStatus === SharingAgreementResponseStatus.DRAFT;
  const isPublished = agreementStatus === SharingAgreementResponseStatus.PUBLISHED;
  const isSuperseded = agreementStatus === SharingAgreementResponseStatus.SUPERSEDED;
  const showAppliedSum = !isDraft;

  // Only meaningful while still DRAFT: once published, the file sum can
  // legitimately include closed/superseded coefficients and no longer needs
  // to read as "incomplete" the way an in-progress draft does.
  const fileGapMessage =
    isDraft && !isFullSum(fileSumUnits) ? formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) : null;

  // Gated on PUBLISHED, not merely "not draft". On a SUPERSEDED agreement nothing
  // is in transition and nothing is pending — the distributor finished with it when
  // it was replaced, and telling an auditor otherwise invites them to chase a
  // closed record.
  const appliedTransitionCaption =
    isPublished && !isFullSum(appliedSumUnits)
      ? "Suma aplicada por debajo del 100 %: normal en transición mientras la distribuidora aplica los coeficientes pendientes."
      : null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: showAppliedSum ? "repeat(2, 1fr)" : "1fr" },
        gap: { xs: 2.5, sm: 4 },
        mb: 3,
      }}
    >
      <Gauge
        label="Suma de los coeficientes"
        sumUnits={fileSumUnits}
        tone={toneFor(fileSumUnits)}
        caption={fileGapMessage}
      />

      {showAppliedSum && (
        <Gauge
          label={isSuperseded ? "Suma aplicada al cierre" : "Suma aplicada"}
          sumUnits={appliedSumUnits}
          tone={isFullSum(appliedSumUnits) ? "complete" : "short"}
          caption={appliedTransitionCaption}
        />
      )}
    </Box>
  );
};
