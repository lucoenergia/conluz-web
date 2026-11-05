import { useCallback, useId, useMemo, useRef, useState, type FC, type FormEvent, type ReactNode } from "react";
import { Box, Button, Dialog, IconButton, SwipeableDrawer, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { colors, radii } from "../../theme/tokens";
import { ResponsiveOverlayContext, type ResponsiveOverlayContextValue } from "./overlayContext";
import { useBackDismiss } from "./overlayHistory";

/** The dialog's width from `md` up: a form, or a confirmation or short action. The sheet is always full width. */
export type ResponsiveOverlaySize = "form" | "compact";

const DIALOG_WIDTH: Record<ResponsiveOverlaySize, number> = { form: 560, compact: 440 };

const DEFAULT_DISCARD_MESSAGE = "Tienes cambios sin guardar. Si cierras, se perderán.";

type Slot = ReactNode | ((overlay: ResponsiveOverlayContextValue) => ReactNode);

export interface ResponsiveOverlayProps {
  open: boolean;
  /** Names the overlay (`aria-labelledby`). */
  title: ReactNode;
  /** A line under the title, such as the community the record belongs to. */
  subtitle?: ReactNode;
  size: ResponsiveOverlaySize;
  /** Unsaved changes: a close attempt asks first, and leaving the page prompts. */
  dirty?: boolean;
  /** A write is in flight: nothing closes the overlay and the close icon is hidden. */
  inFlight?: boolean;
  /** Closes the overlay: nothing changed, or the changes were discarded. */
  onClose: () => void;
  /** The question shown in the footer before discarding changes. */
  discardMessage?: string;
  /** Makes the overlay a form, so a submit button in `actions` submits it. */
  onSubmit?: (event: FormEvent<HTMLElement>) => void;
  /** The scrolling body. */
  children: Slot;
  /** The footer's controls; replaced by the discard question while it is asked. */
  actions: Slot;
}

/**
 * The one overlay for every create, edit, action and confirmation flow (#368):
 * a centred dialog from the `md` breakpoint up, a bottom sheet below it, with a
 * fixed header and footer around a scrolling body. Both trap focus and give it
 * back to the opener on close.
 *
 * Every way of closing it -- the close icon, Escape, the backdrop, a swipe, a
 * consumer's Cancelar through `requestClose`, and browser or system back --
 * goes through one path: ignored while `inFlight`; with `dirty`, the footer
 * asks first, and typing again withdraws the question; otherwise `onClose`.
 * While open and dirty, leaving the page prompts.
 *
 * The overlay does not make its inputs read-only while `inFlight`: a disabled
 * fieldset would grey them and push focus out of the trap. The consumer sets
 * `readOnly` on its own fields.
 *
 * Back is handled through the browser history: the open overlay holds one
 * entry, given back when it closes any other way. To leave the page as it
 * closes, navigate with `useOverlayNavigate`. A reload while it is open leaves
 * that entry behind, inert, costing one extra back press.
 */
export const ResponsiveOverlay: FC<ResponsiveOverlayProps> = ({
  open,
  title,
  subtitle,
  size,
  dirty = false,
  inFlight = false,
  onClose,
  discardMessage = DEFAULT_DISCARD_MESSAGE,
  onSubmit,
  children,
  actions,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const variant = isDesktop ? "dialog" : "sheet";
  const titleId = useId();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const lastFocused = useRef<HTMLElement | null>(null);

  // A closed overlay forgets the question, so it never reopens asking.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setConfirmingDiscard(false);
  }

  useUnsavedChangesGuard(open && dirty);

  const requestClose = useCallback(() => {
    if (inFlight) return;
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }, [inFlight, dirty, onClose]);

  useBackDismiss(open, () => {
    if (inFlight) return true;
    if (dirty) {
      setConfirmingDiscard(true);
      return true;
    }
    onClose();
  });

  const keepEditing = () => {
    setConfirmingDiscard(false);
    lastFocused.current?.focus();
  };

  const context = useMemo<ResponsiveOverlayContextValue>(
    () => ({ variant, requestClose, confirmingDiscard }),
    [variant, requestClose, confirmingDiscard],
  );
  const render = (slot: Slot) => (typeof slot === "function" ? slot(context) : slot);

  const footer = confirmingDiscard ? (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
      <Typography role="alert" variant="body2" sx={{ color: colors.text.body }}>
        {discardMessage}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" size="large" onClick={onClose} sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}>
          Descartar cambios
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={keepEditing}
          autoFocus
          sx={{ minHeight: 44, flex: { xs: 1, md: "none" } }}
        >
          Seguir editando
        </Button>
      </Box>
    </Box>
  ) : (
    render(actions)
  );

  const content = (
    <Box
      component={onSubmit ? "form" : "div"}
      noValidate={onSubmit ? true : undefined}
      onSubmit={onSubmit}
      // Typing again withdraws the question, as an answer to it.
      onChange={() => setConfirmingDiscard(false)}
      sx={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}
    >
      {!isDesktop && (
        <Box aria-hidden sx={{ width: 36, height: 4, borderRadius: radii.small, bgcolor: colors.border.inactive, mx: "auto", mt: 1 }} />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          borderBottom: 1,
          borderColor: "divider",
          p: { xs: "4px 8px 12px 16px", md: "16px 16px 16px 24px" },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
          <Typography id={titleId} variant="h6" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: colors.text.subtle }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {!inFlight && (
          <IconButton aria-label="Cerrar" onClick={requestClose} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box
        onFocus={(event) => {
          if (event.target instanceof HTMLElement) lastFocused.current = event.target;
        }}
        sx={{ overflowY: "auto", p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}
      >
        {render(children)}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          borderTop: 1,
          borderColor: "divider",
          p: { xs: "12px 16px 16px", md: "16px 24px" },
        }}
      >
        {footer}
      </Box>
    </Box>
  );

  const wrapped = <ResponsiveOverlayContext.Provider value={context}>{content}</ResponsiveOverlayContext.Provider>;

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onClose={requestClose}
        aria-labelledby={titleId}
        slotProps={{
          paper: { sx: { width: DIALOG_WIDTH[size], maxWidth: "calc(100% - 32px)", borderRadius: radii.large, m: 2 } },
        }}
      >
        {wrapped}
      </Dialog>
    );
  }

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={requestClose}
      onOpen={() => {}}
      disableSwipeToOpen
      // A drawer sits on the drawer layer, under the app bar (Header lifts it
      // above the side menu); this one is a modal sheet, so it goes on top.
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": titleId,
          sx: {
            maxHeight: "calc(100% - 24px)",
            borderRadius: `${radii.large} ${radii.large} 0 0`,
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {wrapped}
    </SwipeableDrawer>
  );
};
