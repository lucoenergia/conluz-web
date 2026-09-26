import type { FC } from "react";
import { Box, LinearProgress, Paper, Typography } from "@mui/material";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutline";
import { sxStyles } from "../../theme/sx";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { SectionHeading } from "../SectionHeading";
import { pluralize } from "../../utils/pluralize";
import { summarizeApplicationProgress } from "../../pages/production/sharingAgreementApplicationProgress";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

/**
 * Production distribution resolves coefficients purely by `valid_from`/`valid_to`.
 * A pending supply keeps its previous coefficient until this one is activated,
 * so only a supply with no coefficient in force in this plant — typically one
 * joining the plant with this agreement — receives nothing in the meantime.
 * The warning is about those supplies alone, and is shown only while one exists.
 */
const NEW_SUPPLY_CONSEQUENCE =
  "Los puntos de suministro nuevos en la planta no reciben producción hasta que registres su fecha de aplicación. " +
  "Mientras tanto, su autoconsumo y sus excedentes solo se muestran con los datos de la distribuidora, que llegan " +
  "con varios días de retraso.";

export interface SharingAgreementApplicationPanelProps {
  coefficients: SharingAgreementPartitionCoefficientResponse[];
  /**
   * A superseded agreement states why its schedule is finished. It is not
   * "read only": correcting a date and reopening a closed coefficient are still
   * reachable from the coefficient rows, and reopening one revives the
   * agreement — there is simply nothing left to schedule.
   */
  isClosed?: boolean;
}

/**
 * Reporting only: "Registrar fechas" belongs to the next-step banner, which
 * offers it for exactly as long as recording dates is the current step — the
 * same state in which this panel would have shown its own copy. Repeating it
 * here put the identical action twice on one screen.
 */
export const SharingAgreementApplicationPanel: FC<SharingAgreementApplicationPanelProps> = ({
  coefficients,
  isClosed = false,
}) => {
  const { appliedCount: applied, total, hasPendingWithoutCurrent } = summarizeApplicationProgress(coefficients);
  const progress = total === 0 ? 0 : (applied / total) * 100;

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      <SectionHeading
        title="Aplicación del reparto"
        description="Desde qué día empieza a contar el coeficiente de reparto de cada punto de suministro."
      />

      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: fontSizes["2xl"],
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: colors.text.primary,
          }}
        >
          {applied} de {total} {pluralize(total, "punto", "puntos")} con fecha de aplicación
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label="Puntos con fecha de aplicación"
          sx={{
            mt: 1.25,
            height: 8,
            borderRadius: radii.small,
            bgcolor: colors.border.light,
            "& .MuiLinearProgress-bar": { borderRadius: radii.small, bgcolor: colors.success.vivid },
          }}
        />
      </Box>

      {hasPendingWithoutCurrent && (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            bgcolor: colors.background.surface,
            border: "1px solid",
            borderColor: colors.border.light,
            borderRadius: radii.default,
            p: 2,
          }}
        >
          <ErrorOutlineOutlinedIcon sx={{ color: colors.text.secondary, fontSize: 22, flexShrink: 0 }} />
          <Typography sx={{ fontSize: fontSizes.xl, lineHeight: 1.5, color: colors.text.body, textWrap: "pretty" }}>
            {NEW_SUPPLY_CONSEQUENCE}
          </Typography>
        </Box>
      )}

      {isClosed && (
        <Typography sx={{ mt: 2.5, fontSize: fontSizes.lg, lineHeight: 1.5, color: colors.text.subtle }}>
          Todos los puntos tienen fecha de fin.
        </Typography>
      )}
    </Paper>
  );
};
