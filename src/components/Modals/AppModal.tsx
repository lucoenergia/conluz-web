import type { FC, ReactNode, RefObject, SyntheticEvent } from "react";
import { Box } from "@mui/material";
import { ResponsiveOverlay, type ResponsiveOverlayName, type ResponsiveOverlaySize } from "../ResponsiveOverlay";

/**
 * How the dialog is named: by the `title` this modal renders; when the
 * content renders its own heading, by that heading's id; or, when no heading
 * stays on screen throughout, by a `label`. A modal with none of them does not
 * compile (`AppModal.typecheck.tsx`).
 */
type AppModalName =
  | { title: string; labelledBy?: never; label?: never }
  | { title?: undefined; labelledBy: string; label?: never }
  | { title?: undefined; labelledBy?: never; label: string };

export type AppModalProps = AppModalName & {
  isOpen: boolean;
  /**
   * Called by every close attempt the overlay lets through: the close icon,
   * Escape, the backdrop, a swipe, back, and a Cancelar that goes through the
   * overlay's `requestClose`. Back carries no event.
   */
  onClose: (event?: SyntheticEvent) => void;
  /** False while the dialog's write is in flight: nothing closes it (#310, UI-OVL-002). */
  dismissible?: boolean;
  /** The dialog's width from `md` up: `form` for a form, `compact` for a confirmation or short action. */
  size?: ResponsiveOverlaySize;
  /** Unsaved changes: a close attempt asks first (UI-OVL-003). */
  dirty?: boolean;
  /** The question asked before discarding changes, its two buttons, and where staying puts focus. */
  discardMessage?: string;
  discardConfirmLabel?: string;
  discardCancelLabel?: string;
  discardReturnFocus?: RefObject<HTMLElement | null>;
  /** Rendered above the title, e.g. the community a confirmed write lands in. */
  scopeHeader?: ReactNode;
  icon?: ReactNode;
  iconBg?: string;
  iconSize?: number;
  /** Centres the icon and the content in the body, for an outcome with no title. */
  centered?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

/**
 * A dialog on the shared overlay (#369): a centred dialog from `md` up, a
 * bottom sheet below. A Cancelar in `actions` closes through
 * `useResponsiveOverlay().requestClose`, so it asks first when `dirty`.
 */
export const AppModal: FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  labelledBy,
  label,
  dismissible = true,
  size = "form",
  dirty = false,
  discardMessage,
  discardConfirmLabel,
  discardCancelLabel,
  discardReturnFocus,
  scopeHeader,
  icon,
  iconBg,
  iconSize,
  centered = false,
  actions,
  children,
}) => {
  const circleSize = iconSize ?? (centered ? 64 : 48);
  const name: ResponsiveOverlayName =
    title !== undefined ? { title } : label !== undefined ? { label } : { labelledBy: labelledBy as string };

  const circle = icon && (
    <Box
      sx={{
        width: circleSize,
        height: circleSize,
        flexShrink: 0,
        borderRadius: "50%",
        backgroundColor: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: centered ? 3 : 0,
      }}
    >
      {icon}
    </Box>
  );

  return (
    <ResponsiveOverlay
      {...name}
      open={isOpen}
      size={size}
      dirty={dirty}
      discardMessage={discardMessage}
      discardConfirmLabel={discardConfirmLabel}
      discardCancelLabel={discardCancelLabel}
      discardReturnFocus={discardReturnFocus}
      inFlight={!dismissible}
      onClose={() => onClose()}
      eyebrow={scopeHeader}
      icon={centered ? undefined : circle}
      actions={actions}
    >
      {centered ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          {circle}
          {children}
        </Box>
      ) : (
        children
      )}
    </ResponsiveOverlay>
  );
};
