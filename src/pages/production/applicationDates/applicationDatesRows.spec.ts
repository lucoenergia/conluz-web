import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { previewBlocker, type CoefficientDateRow } from "./applicationDatesRows";

const row = (name: string, date: dayjs.Dayjs | null, selected = true): CoefficientDateRow => ({
  coefficientId: `c-${name}`,
  supply: { id: `s-${name}`, code: `ES-${name}`, name },
  coefficient: 0.1,
  storedDate: null,
  selected,
  date,
  dateError: null,
  reference: undefined,
  hint: undefined,
  noData: false,
});

const past = dayjs("2025-03-01");
const future = dayjs().add(1, "day");

describe("previewBlocker", () => {
  it("UI-AGR-033: names one missing date in the singular", () => {
    expect(previewBlocker([row("Norte", null), row("Sur", past)], {})).toBe(
      "Falta 1 fecha: Norte. Escríbela o desmarca ese punto.",
    );
  });

  it("UI-AGR-033: names up to three missing dates in the plural", () => {
    expect(previewBlocker([row("Norte", null), row("Sur", null), row("Este", null)], {})).toBe(
      "Faltan 3 fechas: Norte, Sur y Este. Escríbelas o desmarca esos puntos.",
    );
  });

  it("UI-AGR-033: counts more than three missing dates without naming them", () => {
    expect(previewBlocker(["A", "B", "C", "D"].map((name) => row(name, null)), {})).toBe(
      "Faltan 4 fechas. Corrígelas o desmarca esos puntos.",
    );
  });

  it("UI-AGR-033: one future date in the singular", () => {
    expect(previewBlocker([row("Norte", future)], {})).toBe("Hay 1 fecha no válida o futura. Corrígela o desmarca ese punto.");
  });

  it("UI-AGR-033: several future dates in the plural", () => {
    expect(previewBlocker([row("Norte", future), row("Sur", future)], {})).toBe(
      "Hay 2 fechas no válidas o futuras. Corrígelas o desmarca esos puntos.",
    );
  });

  it("UI-AGR-033: a missing and a future date together, each counted in its own form", () => {
    expect(previewBlocker([row("Norte", null), row("Sur", future)], {})).toBe(
      "Falta 1 fecha y hay 1 fecha no válida o futura. Corrígelas o desmarca esos puntos.",
    );
  });

  it("UI-AGR-033: ignores the unselected rows, and is clear once every selected row has a usable date", () => {
    expect(previewBlocker([row("Norte", past), row("Sur", null, false)], {})).toBeNull();
  });
});
