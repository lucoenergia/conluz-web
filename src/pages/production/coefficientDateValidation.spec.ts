import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { getCoefficientDateDisabledReason, isCoefficientDateValid } from "./coefficientDateValidation";

describe("isCoefficientDateValid", () => {
  it("is false when the date is null", () => {
    expect(isCoefficientDateValid(null, null)).toBe(false);
  });

  it("is false when the date is invalid", () => {
    expect(isCoefficientDateValid(dayjs("not-a-date"), null)).toBe(false);
  });

  it("is false when the date is after today", () => {
    expect(isCoefficientDateValid(dayjs().add(1, "day"), null)).toBe(false);
  });

  it("is true when the date is today", () => {
    expect(isCoefficientDateValid(dayjs(), null)).toBe(true);
  });

  it("is true when the date is in the past", () => {
    expect(isCoefficientDateValid(dayjs().subtract(1, "day"), null)).toBe(true);
  });

  it("is false when the picker itself reports an error, even for an otherwise valid date", () => {
    expect(isCoefficientDateValid(dayjs().subtract(1, "day"), "invalidDate")).toBe(false);
  });
});

describe("getCoefficientDateDisabledReason", () => {
  it("asks the user to pick a date when none is selected", () => {
    expect(getCoefficientDateDisabledReason(null, null, false, "Guardando…")).toBe("Selecciona una fecha");
  });

  it("reports an invalid/future date distinctly from an empty one", () => {
    expect(getCoefficientDateDisabledReason(dayjs().add(1, "day"), null, false, "Guardando…")).toBe(
      "La fecha no puede ser futura ni inválida",
    );
  });

  it("uses the caller's own pending copy once the date is valid but the mutation is in flight", () => {
    expect(getCoefficientDateDisabledReason(dayjs(), null, true, "Aplicando la fecha…")).toBe("Aplicando la fecha…");
  });

  it("is null once the date is valid and nothing is pending", () => {
    expect(getCoefficientDateDisabledReason(dayjs(), null, false, "Guardando…")).toBeNull();
  });
});
