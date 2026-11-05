import { createContext, useContext } from "react";

/** How the overlay is rendered: a centred dialog from `md` up, a bottom sheet below. */
export type ResponsiveOverlayVariant = "dialog" | "sheet";

export interface ResponsiveOverlayContextValue {
  variant: ResponsiveOverlayVariant;
  /** The one close path: ignored in flight, asks first with changes, closes otherwise. */
  requestClose: () => void;
  /** Whether the footer is asking to discard changes. */
  confirmingDiscard: boolean;
}

export const ResponsiveOverlayContext = createContext<ResponsiveOverlayContextValue | null>(null);

/** The overlay a component is rendered in, for content that places controls per variant. */
export function useResponsiveOverlay(): ResponsiveOverlayContextValue {
  const value = useContext(ResponsiveOverlayContext);
  if (!value) throw new Error("useResponsiveOverlay must be used inside a ResponsiveOverlay");
  return value;
}
