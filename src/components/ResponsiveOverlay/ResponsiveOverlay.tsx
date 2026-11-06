import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Box, Button, Dialog, IconButton, SwipeableDrawer, Typography, useMediaQuery, useTheme } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { colors, radii } from "../../theme/tokens";
import { ResponsiveOverlayContext, type ResponsiveOverlayContextValue } from "./overlayContext";
import { useBackDismiss } from "./overlayHistory";
import { OVERLAY_FOCUS_SELECTOR } from "./focusTarget";

/** The dialog's width from `md` up: a form, or a confirmation or short action. The sheet is always full width. */
export type ResponsiveOverlaySize = "form" | "compact";

const DIALOG_WIDTH: Record<ResponsiveOverlaySize, number> = { form: 560, compact: 440 };

const DEFAULT_DISCARD_MESSAGE = "Tienes cambios sin guardar. Si cierras, se perderán.";

type Slot = ReactNode | ((overlay: ResponsiveOverlayContextValue) => ReactNode);

/**
 * A question the flow asks in the footer, such as "delete this?", placed and
 * answered like the unsaved-changes question.
 */
export interface ResponsiveOverlayQuestion {
  /** What is asked, read out as an alert. */
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmColor?: "primary" | "error";
  onConfirm: () => void;
  /** Withdraws the question: its cancel button, and every close attempt while it is asked. */
  onCancel: () => void;
}

const footerButtonSx = { minHeight: 44, flex: { xs: 1, md: "none" } } as const;

/** The footer while a question is asked: the question, then its two answers. */
const FooterQuestion: FC<{ message: ReactNode; children: ReactNode }> = ({ message, children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
    <Box role="alert" sx={{ color: colors.text.body }}>
      {message}
    </Box>
    <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>{children}</Box>
  </Box>
);

/**
 * How the overlay is named: by the `title` it shows; when the content renders
 * its own heading, by that heading's id; or, with no visible title, by a
 * `label`. An overlay with none of them does not compile.
 */
export type ResponsiveOverlayName =
  | { title: ReactNode; labelledBy?: never; label?: never }
  | { title?: undefined; labelledBy: string; label?: never }
  | { title?: undefined; labelledBy?: never; label: string };

export type ResponsiveOverlayProps = ResponsiveOverlayName & {
  open: boolean;
  /** A line under the title, such as the community the record belongs to. */
  subtitle?: ReactNode;
  /** Above the title, outside the heading: the community a confirmed write lands in. */
  eyebrow?: ReactNode;
  /** Before the title, outside the heading. */
  icon?: ReactNode;
  size: ResponsiveOverlaySize;
  /** Unsaved changes: a close attempt asks first, and leaving the page prompts. */
  dirty?: boolean;
  /** A write is in flight: nothing closes the overlay and the close icon is hidden. */
  inFlight?: boolean;
  /** Closes the overlay: nothing changed, or the changes were discarded. */
  onClose: () => void;
  /** The question shown in the footer before discarding changes. */
  discardMessage?: string;
  /** The discard question's button that closes the overlay. "Descartar cambios" by default. */
  discardConfirmLabel?: string;
  /** The discard question's button that keeps the overlay open. "Seguir editando" by default. */
  discardCancelLabel?: string;
  /**
   * Where focus goes when the discard question is answered by staying. By
   * default, the control in the body that last had focus.
   */
  discardReturnFocus?: RefObject<HTMLElement | null>;
  /**
   * A question of the flow's own, asked in the footer while set. Every close
   * attempt, back included, withdraws it instead of closing the overlay.
   */
  question?: ResponsiveOverlayQuestion;
  /**
   * Names what the body shows, such as a flow's step. When it changes while
   * the overlay is open, focus moves to the new content's
   * `OVERLAY_FOCUS_TARGET`, or to the title when it marks none (UI-OVL-009).
   */
  contentKey?: string;
  /** Makes the overlay a form, so a submit button in `actions` submits it. */
  onSubmit?: (event: FormEvent<HTMLElement>) => void;
  /** The scrolling body. */
  children: Slot;
  /** The footer's controls; replaced by the discard question while it is asked. No footer without them. */
  actions?: Slot;
};

/**
 * The one overlay for every create, edit, action and confirmation flow (#368):
 * a centred dialog from the `md` breakpoint up, a bottom sheet below it, with a
 * fixed header and footer around a scrolling body. Both trap focus and give it
 * back to the opener on close.
 *
 * Every way of closing it -- the close icon, Escape, the backdrop, a swipe, a
 * consumer's Cancelar through `requestClose`, and browser or system back --
 * goes through one path: ignored while `inFlight`; while the flow's own
 * `question` is asked, it withdraws that question; with `dirty`, the footer
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
  labelledBy,
  label,
  subtitle,
  eyebrow,
  icon,
  size,
  dirty = false,
  inFlight = false,
  onClose,
  discardMessage = DEFAULT_DISCARD_MESSAGE,
  discardConfirmLabel = "Descartar cambios",
  discardCancelLabel = "Seguir editando",
  discardReturnFocus,
  question,
  contentKey,
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef({ open, contentKey });

  // A closed overlay forgets the question, so it never reopens asking.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setConfirmingDiscard(false);
  }

  useUnsavedChangesGuard(open && dirty);

  // The content the focused control belonged to is gone: without this, focus
  // falls outside the overlay and the new content is not announced. Only a
  // change while it stays open counts: opening keeps MUI's initial focus, and
  // an overlay closing moves nothing (UI-OVL-009).
  useEffect(() => {
    const before = shown.current;
    shown.current = { open, contentKey };
    if (!open || !before.open || before.contentKey === contentKey) return;
    const body = bodyRef.current;
    const target =
      body?.querySelector<HTMLElement>(OVERLAY_FOCUS_SELECTOR) ??
      titleRef.current ??
      // No title: the focus trap's own root, still inside the overlay.
      body?.closest<HTMLElement>('[tabindex="-1"]');
    target?.focus();
  }, [open, contentKey]);

  const requestClose = useCallback(() => {
    if (inFlight) return;
    if (question) question.onCancel();
    else if (dirty) setConfirmingDiscard(true);
    else onClose();
  }, [inFlight, question, dirty, onClose]);

  useBackDismiss(open, () => {
    if (inFlight) return true;
    if (question) {
      question.onCancel();
      return true;
    }
    if (dirty) {
      setConfirmingDiscard(true);
      return true;
    }
    onClose();
  });

  const keepEditing = () => {
    setConfirmingDiscard(false);
    (discardReturnFocus?.current ?? lastFocused.current)?.focus();
  };

  const context = useMemo<ResponsiveOverlayContextValue>(
    () => ({ variant, requestClose, confirmingDiscard }),
    [variant, requestClose, confirmingDiscard],
  );
  const render = (slot: Slot) => (typeof slot === "function" ? slot(context) : slot);

  const footer = question ? (
    <FooterQuestion message={question.message}>
      <Button variant="outlined" size="large" onClick={question.onCancel} autoFocus sx={footerButtonSx}>
        {question.cancelLabel}
      </Button>
      <Button
        variant="contained"
        size="large"
        color={question.confirmColor ?? "primary"}
        onClick={question.onConfirm}
        sx={footerButtonSx}
      >
        {question.confirmLabel}
      </Button>
    </FooterQuestion>
  ) : confirmingDiscard ? (
    <FooterQuestion message={<Typography variant="body2">{discardMessage}</Typography>}>
      <Button variant="outlined" size="large" onClick={onClose} sx={footerButtonSx}>
        {discardConfirmLabel}
      </Button>
      <Button variant="contained" size="large" onClick={keepEditing} autoFocus sx={footerButtonSx}>
        {discardCancelLabel}
      </Button>
    </FooterQuestion>
  ) : (
    actions !== undefined && render(actions)
  );
  const hasHeading = !!(eyebrow || icon || title !== undefined || subtitle);
  const name = { "aria-labelledby": labelledBy ?? (title !== undefined ? titleId : undefined), "aria-label": label };

  const content = (
    <Box
      component={onSubmit ? "form" : "div"}
      noValidate={onSubmit ? true : undefined}
      onSubmit={onSubmit}
      // Typing again withdraws the question, as an answer to it.
      onChange={() => setConfirmingDiscard(false)}
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        // Focused by UI-OVL-009 only, and not controls: a ring would mark
        // nothing the user can act on.
        [`& ${OVERLAY_FOCUS_SELECTOR}[tabindex='-1']:focus, & h2[tabindex='-1']:focus`]: { outline: "none" },
      }}
    >
      {!isDesktop && (
        <Box aria-hidden sx={{ width: 36, height: 4, borderRadius: radii.small, bgcolor: colors.border.inactive, mx: "auto", mt: 1 }} />
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          borderBottom: hasHeading ? 1 : 0,
          borderColor: "divider",
          p: { xs: "4px 8px 12px 16px", md: "16px 16px 16px 24px" },
          pb: hasHeading ? undefined : 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
          {eyebrow}
          {(icon || title !== undefined || subtitle) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {icon}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {title !== undefined && (
                  <Typography id={titleId} ref={titleRef} tabIndex={-1} variant="h6" component="h2">
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>
        {!inFlight && (
          <IconButton aria-label="Cerrar" onClick={requestClose} sx={{ width: 44, height: 44 }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      <Box
        ref={bodyRef}
        onFocus={(event) => {
          if (event.target instanceof HTMLElement) lastFocused.current = event.target;
        }}
        sx={{ overflowY: "auto", p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}
      >
        {render(children)}
      </Box>

      {footer != null && footer !== false && (
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
      )}
    </Box>
  );

  const wrapped = <ResponsiveOverlayContext.Provider value={context}>{content}</ResponsiveOverlayContext.Provider>;

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onClose={requestClose}
        {...name}
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
      // SwipeableDrawer keeps a closed sheet mounted, hidden, for swipe-to-open,
      // which is off: a closed overlay leaves nothing in the page, as the dialog.
      ModalProps={{ keepMounted: false }}
      // A drawer sits on the drawer layer, under the app bar (Header lifts it
      // above the side menu); this one is a modal sheet, so it goes on top.
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          ...name,
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
