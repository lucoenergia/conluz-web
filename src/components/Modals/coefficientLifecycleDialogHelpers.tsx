import { useEffect, useRef, type FC } from "react";
import { Alert, Typography } from "@mui/material";

interface CoefficientDialogErrorPanelProps {
  errorMessages: string[] | null;
}

/**
 * Dialog-local error display, mirroring the persistent panel's visual
 * pattern from the batch-activation flow (Alert severity="error" bullet
 * list, scrolled into view on change) — but its own state, not that panel's:
 * these dialogs act on a single coefficient and must show their own result
 * without disturbing Part A's page-level error panel.
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
