import type { FC } from "react";
import { Box } from "@mui/material";
import { LoadErrorAlert } from "../LoadErrorAlert";

interface CapabilityLoadErrorProps {
  onRetry: () => void;
}

/**
 * Shown when the app could not find out whether the user may open a page.
 *
 * Deliberately not a redirect. Sending somebody to the home page because a
 * request failed tells them they lack access, which may be untrue and which
 * they cannot act on. Saying the check failed, and offering to run it again,
 * is both honest and recoverable.
 */
export const CapabilityLoadError: FC<CapabilityLoadErrorProps> = ({ onRetry }) => (
  <Box sx={{ p: 2 }}>
    <LoadErrorAlert
      message="No se pudo comprobar tus permisos para esta página. Comprueba tu conexión e inténtalo de nuevo."
      onRetry={onRetry}
    />
  </Box>
);
