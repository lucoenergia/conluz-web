import type { FC } from "react";
import { Alert, Button } from "@mui/material";

export interface LoadErrorAlertProps {
  /** What could not be loaded, in the user's words. */
  message: string;
  onRetry: () => void;
}

/**
 * The load-failure idiom: an error Alert stating what failed, with a retry.
 *
 * A failed read is reported and recoverable, never folded into "there is
 * nothing here" or "you may not see this".
 */
export const LoadErrorAlert: FC<LoadErrorAlertProps> = ({ message, onRetry }) => (
  <Alert
    severity="error"
    action={
      <Button color="inherit" size="small" onClick={onRetry}>
        Reintentar
      </Button>
    }
  >
    {message}
  </Alert>
);
