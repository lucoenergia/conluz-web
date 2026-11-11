import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { PeriodSelector } from "./PeriodSelector";
import { DAY_YEAR, LAST_12, LAST_30, LAST_7, LATEST, YEAR, dayAnchor, monthAnchor, type Anchor, type PeriodSelection } from "./historicalPeriod";

/** Every shipped preset, of both kinds of anchor, in one list. */
const MIXED = [LATEST, LAST_7, YEAR, LAST_30, LAST_12, DAY_YEAR];
const RANGE: PeriodSelection = { kind: "custom", from: { year: 2026, month: 11, day: 1 }, to: { year: 2026, month: 11, day: 2 } };

// jsdom answers no media query, which reads as a phone: the selector is a bottom sheet of radios.
async function offeredOptions(anchor: Anchor) {
  renderWithProviders(<PeriodSelector anchor={anchor} presets={MIXED} selection={RANGE} onSelect={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole("button", { name: /Periodo/ }));
  const sheet = screen.getByRole("dialog", { name: "Periodo" });
  return within(sheet).getAllByRole("radio");
}

/** Each option is named by its preset's name, then the period it stands for. */
function expectNamed(options: HTMLElement[], names: string[]) {
  expect(options).toHaveLength(names.length);
  options.forEach((option, index) => expect(option).toHaveAccessibleName(new RegExp(`^${names[index]} `)));
}

describe("UI-HIS-009 the selector offers only the presets that take the anchor's kind (#401)", () => {
  it("UI-HIS-009 AC7 -- under a day anchor, the day presets and the custom range, in the list's order", async () => {
    expectNamed(await offeredOptions(dayAnchor({ year: 2026, month: 11, day: 8 })), [
      "Últimos 7 días",
      "Últimos 30 días",
      "Año 2026",
      "Rango personalizado",
    ]);
  });

  it("UI-HIS-009 AC7 -- under a month anchor, the month presets and the custom range", async () => {
    expectNamed(await offeredOptions(monthAnchor({ year: 2026, month: 11 })), [
      "Último mes publicado",
      "Año 2026",
      "Últimos 12 meses",
      "Rango personalizado",
    ]);
  });
});
