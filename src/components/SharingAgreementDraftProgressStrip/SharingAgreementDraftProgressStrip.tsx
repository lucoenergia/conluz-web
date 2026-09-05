import type { FC, ReactNode } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { alphas, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import {
  computeSharingAgreementCoefficientSums,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";

export interface SharingAgreementDraftProgressStripProps {
  coefficients: CoefficientSummable[];
  /** agreement.file truthiness — set only by import, never by generate (which is stateless). */
  hasFile: boolean;
}

type StepVisual = "done" | "current" | "upcoming";

const CIRCLE_SIZE = 32;

const Connector: FC = () => (
  <Box sx={{ flex: 1, minWidth: 16, height: "1px", bgcolor: colors.divider, display: { xs: "none", sm: "block" } }} />
);

const Segment: FC<{ label: string; icon: ReactNode; sx?: object }> = ({ label, icon, sx }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
    <Box
      sx={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...sx,
      }}
    >
      {icon}
    </Box>
    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </Typography>
  </Box>
);

export const SharingAgreementDraftProgressStrip: FC<SharingAgreementDraftProgressStripProps> = ({
  coefficients,
  hasFile,
}) => {
  const theme = useTheme();
  const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);

  const step1Done = isFullSum(fileSumUnits);
  const step2Done = hasFile;
  // The step currently in progress — step 3 (Envío) is never "current" in this
  // sense, since it's informational-only and never advances the strip.
  const currentStep: 1 | 2 = !step1Done ? 1 : 2;

  const visualFor = (step: 1 | 2, done: boolean): StepVisual => {
    if (done) return "done";
    if (step === currentStep) return "current";
    return "upcoming";
  };

  const circleSx = (visual: StepVisual) => {
    if (visual === "done") return { bgcolor: alphas.success.subtle };
    if (visual === "current") return { bgcolor: alpha(theme.palette.primary.main, 0.12) };
    return { bgcolor: colors.background.surface, border: `1px solid ${colors.border.light}` };
  };

  const numberSx = (visual: StepVisual) => ({
    color: visual === "current" ? "primary.main" : colors.text.muted,
    fontWeight: 700,
    fontSize: fontSizes.md,
  });

  const step1Visual = visualFor(1, step1Done);
  const step2Visual = visualFor(2, step2Done);

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: 1.5, sm: 1 },
        }}
      >
        <Segment
          label="Reparto"
          sx={circleSx(step1Visual)}
          icon={
            step1Visual === "done" ? (
              <CheckCircleOutlineIcon sx={{ color: "success.main", fontSize: 20 }} />
            ) : (
              <Typography component="span" sx={numberSx(step1Visual)}>
                1
              </Typography>
            )
          }
        />
        <Connector />
        <Segment
          label="Fichero"
          sx={circleSx(step2Visual)}
          icon={
            step2Visual === "done" ? (
              <CheckCircleOutlineIcon sx={{ color: "success.main", fontSize: 20 }} />
            ) : (
              <Typography component="span" sx={numberSx(step2Visual)}>
                2
              </Typography>
            )
          }
        />
        <Connector />
        {/* Envío happens outside Conluz (by email) and can never be known to be
            done — always the same informational treatment, never a checkable
            or "current" state, regardless of steps 1/2. */}
        <Segment
          label="Envío"
          sx={{ bgcolor: alphas.info.subtle }}
          icon={<InfoOutlinedIcon sx={{ color: "info.main", fontSize: 20 }} />}
        />
        <Connector />
        <Segment
          label="Vigente"
          sx={{ bgcolor: colors.background.surface, border: `1px solid ${colors.border.light}` }}
          icon={
            <Typography component="span" sx={numberSx("upcoming")}>
              4
            </Typography>
          }
        />
      </Box>
    </Paper>
  );
};
