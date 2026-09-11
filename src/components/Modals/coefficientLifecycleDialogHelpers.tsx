import { useEffect, useRef, type FC } from "react";
import { Alert, Box, Typography } from "@mui/material";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { getCoefficientCupsLabel } from "../../pages/production/sharingAgreementCoefficientState";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

interface CoefficientDialogErrorPanelProps {
  errorMessages: string[] | null;
}

/**
 * Dialog-local error display, mirroring the persistent panel's visual
 * pattern from the batch-activation flow (Alert severity="error" bullet
 * list, scrolled into view on change) — but its own state, not that panel's.
 * Used only by the row path (source: "row"): a batch dialog closes on
 * rejection and reports through the page-level persistent panel instead, so
 * this never renders for more than one coefficient in practice.
 */
export const CoefficientDialogErrorPanel: FC<CoefficientDialogErrorPanelProps> = ({ errorMessages }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorMessages !== null) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [errorMessages]);

  if (errorMessages === null) return null;

  return (
    <Alert ref={ref} severity="error" sx={{ mt: 2 }}>
      {errorMessages.length > 0 ? (
        errorMessages.map((message, index) => (
          <Typography key={index} variant="body2" sx={{ mt: index === 0 ? 0 : 0.5 }}>
            • {message}
          </Typography>
        ))
      ) : (
        <Typography variant="body2">No se ha podido completar la acción. Inténtalo de nuevo en unos instantes.</Typography>
      )}
    </Alert>
  );
};

interface CoefficientTargetSummaryProps {
  coefficients: readonly SharingAgreementPartitionCoefficientResponse[];
  /** How many of these targets are currently hidden by the filter behind the modal. */
  hiddenCount: number;
}

/**
 * Multi-target content for a batch dialog: how many coefficients, every
 * one's CUPS in a scrollable list (never truncated to "y N más" — this feeds
 * billing, the user must be able to see every affected supply), and how many
 * are hidden by the current filter. Renders nothing for a single-target
 * dialog — those keep their own inline CUPS chip, unchanged since before
 * batch dialogs existed.
 */
export const CoefficientTargetSummary: FC<CoefficientTargetSummaryProps> = ({ coefficients, hiddenCount }) => {
  if (coefficients.length <= 1) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: "secondary.main", mb: 1 }}>
        {coefficients.length} coeficientes seleccionados
      </Typography>
      <Box
        sx={{
          maxHeight: 160,
          overflowY: "auto",
          border: `1px solid ${colors.border.light}`,
          borderRadius: radii.default,
          p: 1,
        }}
      >
        {coefficients.map((coefficient) => (
          <Typography key={coefficient.coefficientId} variant="body2" sx={{ py: 0.25 }}>
            {getCoefficientCupsLabel(coefficient)}
          </Typography>
        ))}
      </Box>
      {hiddenCount > 0 && (
        <Typography variant="caption" sx={{ color: colors.text.subtle, display: "block", mt: 0.5 }}>
          {hiddenCount} {hiddenCount === 1 ? "no se ve" : "no se ven"} con el filtro actual
        </Typography>
      )}
    </Box>
  );
};
