import { useCallback, useMemo, useState } from "react";

export interface RowSelectionOptions {
  /** The ids that may be selected right now, in display order. */
  selectableIds: readonly string[];
  /** How many rows the selection may hold at most. Unlimited when omitted. */
  max?: number;
}

export interface RowSelection {
  /** The selection, in the order it was made, holding only ids still selectable. */
  selectedIds: string[];
  isSelected: (id: string) => boolean;
  /** Adds or removes one row. Adding does nothing once the limit is reached. */
  toggle: (id: string) => void;
  /** Removes one row, if selected: after acting on that row alone, say. */
  deselect: (id: string) => void;
  /**
   * The tri-state "select all" over the rows shown: from unchecked or
   * indeterminate it selects them, in order and up to the limit; once nothing
   * more can be added it deselects them. Never touches a row not shown.
   */
  toggleAll: (visibleIds: readonly string[]) => void;
  /** Whether "select all" over these rows reads as checked: nothing more can be added. */
  allSelected: (visibleIds: readonly string[]) => boolean;
  /** Whether "select all" over these rows reads as indeterminate. */
  someSelected: (visibleIds: readonly string[]) => boolean;
  isAtLimit: boolean;
  /** True when the last "select all" stopped at the limit, until the selection changes otherwise. */
  truncatedByLimit: boolean;
  clear: () => void;
}

/**
 * Selection state for a list whose rows can be acted on together.
 *
 * It stores ids, not rows, and drops on every render any id that is no longer
 * selectable: a write refreshes the list, and a stored row would answer from
 * before it.
 */
export function useRowSelection({ selectableIds, max = Infinity }: RowSelectionOptions): RowSelection {
  const [stored, setStored] = useState<string[]>([]);
  const [truncatedByLimit, setTruncatedByLimit] = useState(false);

  const selectable = useMemo(() => new Set(selectableIds), [selectableIds]);
  const selectedIds = useMemo(() => stored.filter((id) => selectable.has(id)), [stored, selectable]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isAtLimit = selectedIds.length >= max;

  const visibleSelectable = useCallback(
    (visibleIds: readonly string[]) => visibleIds.filter((id) => selectable.has(id)),
    [selectable],
  );

  const allSelected = useCallback(
    (visibleIds: readonly string[]) => {
      const visible = visibleSelectable(visibleIds);
      const visibleSelected = visible.filter((id) => selected.has(id)).length;
      if (visible.length === 0) return false;
      return visibleSelected === visible.length || (isAtLimit && visibleSelected > 0);
    },
    [visibleSelectable, selected, isAtLimit],
  );

  const someSelected = useCallback(
    (visibleIds: readonly string[]) =>
      !allSelected(visibleIds) && visibleSelectable(visibleIds).some((id) => selected.has(id)),
    [allSelected, visibleSelectable, selected],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!selectable.has(id)) return;
      setTruncatedByLimit(false);
      if (selected.has(id)) setStored(selectedIds.filter((other) => other !== id));
      else if (!isAtLimit) setStored([...selectedIds, id]);
    },
    [selectable, selected, selectedIds, isAtLimit],
  );

  const toggleAll = useCallback(
    (visibleIds: readonly string[]) => {
      const visible = visibleSelectable(visibleIds);
      if (allSelected(visibleIds)) {
        const hidden = new Set(visible);
        setStored(selectedIds.filter((id) => !hidden.has(id)));
        setTruncatedByLimit(false);
        return;
      }
      const next = [...selectedIds];
      const toAdd = visible.filter((id) => !selected.has(id));
      const room = Math.max(0, max - next.length);
      next.push(...toAdd.slice(0, room));
      setStored(next);
      setTruncatedByLimit(toAdd.length > room);
    },
    [visibleSelectable, allSelected, selectedIds, selected, max],
  );

  // Against the latest state, not this render's: it is called once a write
  // settles, from a handler that closed over the render that started it.
  const deselect = useCallback((id: string) => {
    setStored((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : prev));
  }, []);

  const clear = useCallback(() => {
    setStored([]);
    setTruncatedByLimit(false);
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selectedIds,
    isSelected,
    toggle,
    deselect,
    toggleAll,
    allSelected,
    someSelected,
    isAtLimit,
    truncatedByLimit,
    clear,
  };
}
