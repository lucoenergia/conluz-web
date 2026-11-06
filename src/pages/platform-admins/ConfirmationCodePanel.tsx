import { useEffect, useRef, useState, type FC, type RefObject } from "react";
import { Box, Button, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { groupedCode } from "../../utils/confirmationCode";
import { Notice } from "../../components/Notice";
import { OVERLAY_FOCUS_TARGET } from "../../components/ResponsiveOverlay";

const COPY_FEEDBACK_MS = 2000;

interface ConfirmationCodePanelProps {
  /** The code the invite or resend response carried. Held by the dialog hosting this panel, nowhere else. */
  code: string;
  fullName: string;
  /** The copy button, where answering "Volver al código" puts focus. */
  copyButtonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The confirmation code of a platform-admin invitation, shown once (#288).
 *
 * The backend returns it only in the invite or resend response, and never
 * again: this panel is the only place it is ever on screen. It is rendered
 * inside the dialog that ran the write, which keeps the code in its own state,
 * so closing the dialog discards it. This is the dialog's body: the host
 * gives it the title, "Hecho", and the question any other close attempt asks
 * first (`confirmationCodeQuestion.ts`). A stray click, Escape or back would
 * lose a code that cannot be shown again, and getting a new one spends one of
 * the day's resends.
 */
export const ConfirmationCodePanel: FC<ConfirmationCodePanelProps> = ({ code, fullName, copyButtonRef }) => {
  const [copied, setCopied] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // An insecure context or a denied permission: nothing reached the
      // clipboard, so the button must not claim it did.
      return;
    }
    setCopied(true);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  };

  return (
    <>
      <Typography variant="body2">
        Hemos enviado la invitación a <strong>{fullName}</strong>. Para aceptarla necesitará este código:
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2,
          py: 1.5,
          borderRadius: radii.default,
          bgcolor: colors.background.surface,
          border: 1,
          borderColor: "divider",
        }}
      >
        {/* Where focus goes when the code replaces the form, so it is read out (UI-OVL-009). */}
        <Typography
          component="code"
          {...OVERLAY_FOCUS_TARGET}
          tabIndex={-1}
          sx={{ fontFamily: "monospace", fontSize: fontSizes["2xl"], fontWeight: 700, letterSpacing: "0.12em" }}
        >
          {groupedCode(code)}
        </Typography>
        <Button
          ref={copyButtonRef}
          size="small"
          variant="outlined"
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          onClick={() => void handleCopy()}
          aria-label={copied ? "Código copiado" : "Copiar código"}
        >
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </Box>
      <Notice severity="warning">
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <li>Dáselo por teléfono o en persona, nunca por email.</li>
          <li>No se volverá a mostrar: apúntalo o cópialo antes de cerrar.</li>
          <li>Si reenvías la invitación, se generará uno nuevo y este dejará de funcionar.</li>
        </Box>
      </Notice>
    </>
  );
};
