import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { CustomRangePicker } from "./CustomRangePicker";
import { dayAnchor, monthAnchor, type Anchor } from "./historicalPeriod";

const NO_DATA_YET = "Los días después del 8 de noviembre de 2026 todavía no tienen datos.";

function renderPicker(anchor: Anchor) {
  renderWithProviders(
    <CustomRangePicker open anchor={anchor} current={{ kind: "last7" }} variant="sheet" anchorEl={null} onClose={vi.fn()} onApply={vi.fn()} />,
  );
  return screen.getByRole("dialog", { name: "Rango personalizado" });
}

/** The day cells of the calendar shown, by their day of the month. */
const dayCell = (dialog: HTMLElement, dayOfMonth: number) => within(dialog).getByRole("gridcell", { name: String(dayOfMonth) });

describe("UI-HIS-008 a day anchor bounds the custom range picker at its own day (#401)", () => {
  it("UI-HIS-008 AC6 -- the days after the anchor day are disabled, the anchor day is not, and the picker says why", () => {
    const dialog = renderPicker(dayAnchor({ year: 2026, month: 11, day: 8 }));

    expect(within(dialog).getByText("Noviembre de 2026")).toBeInTheDocument();
    for (const dayOfMonth of [1, 8]) expect(dayCell(dialog, dayOfMonth)).toBeEnabled();
    for (const dayOfMonth of [9, 10, 20, 30]) expect(dayCell(dialog, dayOfMonth)).toBeDisabled();
    expect(within(dialog).getByText(NO_DATA_YET)).toBeInTheDocument();
  });

  it("UI-HIS-005 AC6 -- the picker never pages past the anchor's month", () => {
    const dialog = renderPicker(dayAnchor({ year: 2026, month: 11, day: 8 }));

    expect(within(dialog).getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });

  it("UI-HIS-008 a month anchor leaves its whole month pickable and says nothing about days", () => {
    const dialog = renderPicker(monthAnchor({ year: 2026, month: 11 }));

    expect(dayCell(dialog, 30)).toBeEnabled();
    expect(within(dialog).queryByText(/todavía no tienen datos/)).not.toBeInTheDocument();
  });
});
