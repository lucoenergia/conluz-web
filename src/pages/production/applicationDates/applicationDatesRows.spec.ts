import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { CoefficientObservationResponseStatus } from "../../../api/models";
import { buildCoefficient, buildCoefficientObservation, buildSharingAgreementObservation } from "../../../test/fixtures";
import { initialDateRows, previewBlocker, withSelection, type CoefficientDateRow } from "./applicationDatesRows";

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
  unselectedReason: "Sin cambios",
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

describe("a dated row with a proposed date", () => {
  // Dated on 15/03/2025 in Madrid; its change cannot be observed, so the backend proposes a date.
  const dated = buildCoefficient({
    coefficientId: "c-sur",
    validFrom: "2025-03-14T23:00:00Z",
  });
  const rowProposing = (proposedDate: { from: string | null; to: string }) =>
    initialDateRows(
      [dated],
      buildSharingAgreementObservation({
        coefficients: [
          buildCoefficientObservation({
            coefficientId: "c-sur",
            proposedDate,
            status: CoefficientObservationResponseStatus.NOT_DISTINGUISHABLE,
          }),
        ],
      }),
    )[0];

  it("UI-AGR-032: never calls the stored date correct, even on the proposed day: a proposal is no evidence", () => {
    expect(rowProposing({ from: "2025-03-15", to: "2025-03-15" }).unselectedReason).toBe(
      "Registrada 15/03/2025 · Propuesta 15/03/2025. Márcalo para usarla.",
    );
  });

  it("UI-AGR-032: names both days, and holds no day until marked", () => {
    const row = rowProposing({ from: "2025-03-01", to: "2025-03-01" });

    expect(row.unselectedReason).toBe("Registrada 15/03/2025 · Propuesta 01/03/2025. Márcalo para usarla.");
    expect(row.date).toBeNull();
    expect(withSelection(row, true).date?.format("YYYY-MM-DD")).toBe("2025-03-01");
    expect(withSelection(withSelection(row, true), false).date).toBeNull();
  });

  it("UI-AGR-032: a proposed range or open date reads 'Propuesta', never 'Observada'", () => {
    expect(rowProposing({ from: "2025-02-26", to: "2025-03-04" }).unselectedReason).toBe(
      "Propuesta entre el 26/02/2025 y el 04/03/2025. Elige una fecha y márcalo.",
    );
    expect(rowProposing({ from: null, to: "2023-04-01" }).unselectedReason).toBe(
      "Propuesta el 01/04/2023 o antes: Datadis no tiene datos anteriores. Elige la fecha real y márcalo.",
    );
  });
});

describe("withSelection", () => {
  it("UI-AGR-032: leaves the date of an undated row as it is, marked or not", () => {
    const prefilled = row("Norte", past, true);

    expect(withSelection(prefilled, false).date).toBe(past);
    expect(withSelection(row("Sur", null, false), true).date).toBeNull();
  });
});
