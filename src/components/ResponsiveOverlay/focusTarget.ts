/**
 * Spread onto the element of an overlay's body that takes focus when its
 * `contentKey` changes: the new content's main message or first control
 * (UI-OVL-009). One that is not focusable by itself also takes `tabIndex={-1}`.
 */
export const OVERLAY_FOCUS_TARGET = { "data-overlay-focus": "" } as const;

export const OVERLAY_FOCUS_SELECTOR = "[data-overlay-focus]";
