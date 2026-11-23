import { useCallback, useId, useState, type FC } from "react";
import { Box, Button, Link, Typography } from "@mui/material";
import { ResponsiveOverlay } from "../../../components/ResponsiveOverlay";
import { colors } from "../../../theme/tokens";
import {
  ANOMALY_COUNT_ORDER,
  ANOMALY_TYPE_LABEL,
  COEFFICIENT_STATUS_LABEL,
  LEAVING_STATUS_LABEL,
  STATUS_COUNT_ORDER,
} from "./observedSharingLabels";
import {
  ANOMALY_TYPE_MEANING,
  COEFFICIENT_STATUS_MEANING,
  HELP_TERMS,
  LEAVING_STATUS_MEANING,
  type HelpTerm,
} from "./observedSharingHelp";

const HELP_TITLE = "Cómo leer el reparto observado";

/**
 * One section of the help: a heading and its terms. Each meaning is written
 * to follow its term ("β registrada: el coeficiente…"); set below it, its first
 * letter is shown upper case.
 */
const HelpSection: FC<{ title: string; terms: HelpTerm[]; focusTerm?: string }> = ({ title, terms, focusTerm }) => {
  const headingId = useId();
  // Focused as it mounts, before the dialog's focus trap looks for focus, so it keeps it.
  const focusOnMount = useCallback((element: HTMLDivElement | null) => element?.focus(), []);
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} variant="subtitle1" component="h3" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Box component="dl" sx={{ m: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {terms.map(({ term, meaning, parts }) => (
          <Box
            key={term}
            {...(term === focusTerm && { ref: focusOnMount, tabIndex: -1, sx: { "&:focus": { outline: "none" } } })}
          >
            <Typography component="dt" variant="body2" sx={{ fontWeight: 600 }}>
              {term}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{ m: 0, color: colors.text.body, "&::first-letter": { textTransform: "uppercase" } }}
            >
              {meaning}
              {parts && (
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                  {parts.map((part) => (
                    <li key={part}>{part}</li>
                  ))}
                </Box>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/** The statuses in the order the agreement cards count them; a leaving status reads as one, applied to its closing date. */
const STATUSES = STATUS_COUNT_ORDER.map(({ status }) => status);

/** The anomaly types in the order the agreement cards count them. */
const ANOMALY_TYPES = ANOMALY_COUNT_ORDER.map(({ type }) => type);

/**
 * The help dialog (UI-AGR-038): what the view's terms, every coefficient and
 * leaving status and every anomaly type mean, with the labels the view shows
 * them under. Opened at a term, it takes focus there, so it is read first and
 * scrolled into view.
 */
export const ObservedSharingHelpDialog: FC<{ open: boolean; onClose: () => void; focusTerm?: string }> = ({
  open,
  onClose: close,
  focusTerm,
}) => (
  <ResponsiveOverlay
    open={open}
    onClose={close}
    title={HELP_TITLE}
    size="form"
    hideCloseIcon
    actions={
      <Button variant="contained" onClick={close}>
        Cerrar
      </Button>
    }
  >
    <HelpSection title="Términos" terms={HELP_TERMS} focusTerm={focusTerm} />
    <HelpSection
      title="Estados de los coeficientes"
      terms={STATUSES.map((status) => ({
        term: COEFFICIENT_STATUS_LABEL[status],
        meaning: COEFFICIENT_STATUS_MEANING[status],
      }))}
    />
    <HelpSection
      title="Estados de las salidas del reparto"
      terms={STATUSES.map((status) => ({ term: LEAVING_STATUS_LABEL[status], meaning: LEAVING_STATUS_MEANING[status] }))}
    />
    <HelpSection
      title="Anomalías"
      terms={ANOMALY_TYPES.map((type) => ({ term: ANOMALY_TYPE_LABEL[type], meaning: ANOMALY_TYPE_MEANING[type] }))}
    />
  </ResponsiveOverlay>
);

/** "¿Qué significa cada estado?" and the help dialog it opens at the top (UI-AGR-038). */
export const ObservedSharingHelp: FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link component="button" type="button" variant="body2" onClick={() => setOpen(true)} sx={{ textAlign: "left" }}>
        ¿Qué significa cada estado?
      </Link>
      <ObservedSharingHelpDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
