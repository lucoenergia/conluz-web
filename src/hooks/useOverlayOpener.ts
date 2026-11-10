import { useCallback, useEffect, useRef, type RefObject } from "react";

/** The focused element, when it is one focus can be returned to. */
const focusedElement = () => (document.activeElement instanceof HTMLElement ? document.activeElement : null);

export interface OpenerRecord {
  /** The control recorded last, or null. */
  opener: RefObject<HTMLElement | null>;
  /**
   * Records the control an overlay is opened from. Without an argument, the
   * one holding focus: a control whose click handler receives no event, such
   * as `EmptyState`'s action, still holds focus once clicked.
   */
  record: (element?: HTMLElement | null) => void;
}

/**
 * The control an overlay was opened from, for a screen that decides itself
 * where focus goes once the overlay closes.
 */
export function useOpenerRecord(): OpenerRecord {
  const opener = useRef<HTMLElement | null>(null);
  const record = useCallback((element?: HTMLElement | null) => {
    opener.current = element === undefined ? focusedElement() : element;
  }, []);
  return { opener, record };
}

export interface OverlayOpener {
  /**
   * Records the control the overlay is opened from; call it as the overlay
   * opens. `handOver` marks an opener that the overlay's own write will
   * unmount, such as an empty state replaced by the list it creates the first
   * row of: focus then goes to the control passed to `handOver` as it mounts.
   */
  record: (element?: HTMLElement | null, options?: { handOver?: boolean }) => void;
  /** A ref callback for the control that takes focus over from an unmounted opener. */
  handOver: (element: HTMLElement | null) => void;
}

/**
 * Returns focus to the control an overlay was opened from, once the overlay
 * has unmounted.
 *
 * After it has unmounted, so the overlay's own focus restoration has already
 * run: it aims at the element focused when the overlay opened, which for an
 * edit is the row menu's item, gone by the time the form closes. The opener a
 * list records is the row's kebab instead.
 */
export function useOverlayOpener(open: boolean): OverlayOpener {
  const { opener, record: recordOpener } = useOpenerRecord();
  const handingOver = useRef(false);

  const record = useCallback(
    (element?: HTMLElement | null, { handOver = false }: { handOver?: boolean } = {}) => {
      recordOpener(element);
      handingOver.current = handOver;
    },
    [recordOpener],
  );

  const handOver = useCallback((element: HTMLElement | null) => {
    if (!element || !handingOver.current) return;
    handingOver.current = false;
    // Only when the opener took the focus with it, never from elsewhere.
    if (document.activeElement === document.body) element.focus();
  }, []);

  useEffect(() => {
    if (open || !opener.current) return;
    opener.current.focus();
    opener.current = null;
  }, [open, opener]);

  return { record, handOver };
}
