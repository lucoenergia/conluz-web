import type { FC } from "react";
import { Alert, Box, Button } from "@mui/material";

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
 *
 * Follows the load-failure idiom the pages already use -- an Alert with a
 * Spanish message -- and adds the retry it needs.
 */
export const CapabilityLoadError: FC<CapabilityLoadErrorProps> = ({ onRetry }) => (
  <Box sx={{ p: 2 }}>
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Reintentar
        </Button>
      }
    >
      No se pudo comprobar tus permisos para esta página. Comprueba tu conexión e inténtalo de nuevo.
    </Alert>
  </Box>
);
