import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRowSelection, type RowSelectionOptions } from "./useRowSelection";

const ids = (count: number) => Array.from({ length: count }, (_, i) => `id-${i + 1}`);

function renderSelection(options: RowSelectionOptions) {
  return renderHook((props: RowSelectionOptions) => useRowSelection(props), { initialProps: options });
}

describe("useRowSelection", () => {
  it("toggles a row in and out, keeping the order the rows were selected in", () => {
    const { result } = renderSelection({ selectableIds: ids(3) });

    act(() => result.current.toggle("id-3"));
    act(() => result.current.toggle("id-1"));
    expect(result.current.selectedIds).toEqual(["id-3", "id-1"]);
    expect(result.current.isSelected("id-1")).toBe(true);

    act(() => result.current.toggle("id-3"));
    expect(result.current.selectedIds).toEqual(["id-1"]);
  });

  it("ignores an id that is not selectable", () => {
    const { result } = renderSelection({ selectableIds: ids(2) });

    act(() => result.current.toggle("someone-else"));

    expect(result.current.selectedIds).toEqual([]);
  });

  it("drops a selected id once it is no longer selectable", () => {
    const { result, rerender } = renderSelection({ selectableIds: ids(3) });
    act(() => result.current.toggle("id-1"));
    act(() => result.current.toggle("id-2"));

    rerender({ selectableIds: ["id-2", "id-3"] });

    expect(result.current.selectedIds).toEqual(["id-2"]);
  });

  it("selects every row shown, then deselects them, leaving rows not shown alone", () => {
    const { result } = renderSelection({ selectableIds: ids(4) });
    act(() => result.current.toggle("id-4"));
    const shown = ["id-1", "id-2", "not-selectable"];

    expect(result.current.allSelected(shown)).toBe(false);
    act(() => result.current.toggleAll(shown));
    expect(result.current.selectedIds).toEqual(["id-4", "id-1", "id-2"]);
    expect(result.current.allSelected(shown)).toBe(true);

    act(() => result.current.toggleAll(shown));
    expect(result.current.selectedIds).toEqual(["id-4"]);
  });

  it("reads as indeterminate while only some of the rows shown are selected", () => {
    const { result } = renderSelection({ selectableIds: ids(3) });

    act(() => result.current.toggle("id-2"));

    expect(result.current.someSelected(ids(3))).toBe(true);
    expect(result.current.allSelected(ids(3))).toBe(false);
  });

  it("stops at the limit, says so, and adds no further row", () => {
    const { result } = renderSelection({ selectableIds: ids(60), max: 50 });

    act(() => result.current.toggleAll(ids(60)));

    expect(result.current.selectedIds).toEqual(ids(50));
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.truncatedByLimit).toBe(true);
    expect(result.current.allSelected(ids(60))).toBe(true);

    act(() => result.current.toggle("id-51"));
    expect(result.current.selectedIds).toHaveLength(50);
    expect(result.current.isSelected("id-51")).toBe(false);
  });

  it("does not report a truncation when every row fitted", () => {
    const { result } = renderSelection({ selectableIds: ids(50), max: 50 });

    act(() => result.current.toggleAll(ids(50)));

    expect(result.current.selectedIds).toHaveLength(50);
    expect(result.current.truncatedByLimit).toBe(false);
  });

  it("clears the whole selection", () => {
    const { result } = renderSelection({ selectableIds: ids(60), max: 50 });
    act(() => result.current.toggleAll(ids(60)));

    act(() => result.current.clear());

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.truncatedByLimit).toBe(false);
  });
});
