import type { MouseEvent } from "react";

/**
 * A row's kebab (actions) button, the same on `ListTable` and `RecordList`.
 *
 * The button opens the page's `RowActionsMenu` anchored at
 * `event.currentTarget`. A page whose menu is built from capabilities can reach
 * a row with nothing in it: `has` returns false for that row, which then gets no
 * button rather than one that opens an empty menu.
 */
export interface RowActions<T> {
  /** Accessible name of the row's kebab button. */
  label: (row: T) => string;
  onClick: (event: MouseEvent<HTMLElement>, row: T) => void;
  /** Whether this row has any action to offer. Every row does, by default. */
  has?: (row: T) => boolean;
}
