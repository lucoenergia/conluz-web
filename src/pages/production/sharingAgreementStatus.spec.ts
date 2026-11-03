import { describe, expect, test } from "vitest";
import { SharingAgreementResponseStatus } from "../../api/models";
import { getSharingAgreementStatusLabel } from "./sharingAgreementStatus";

describe("getSharingAgreementStatusLabel", () => {
  test("maps DRAFT to Borrador", () => {
    expect(getSharingAgreementStatusLabel(SharingAgreementResponseStatus.DRAFT)).toBe("Borrador");
  });

  test("maps PUBLISHED to Vigente", () => {
    expect(getSharingAgreementStatusLabel(SharingAgreementResponseStatus.PUBLISHED)).toBe("Vigente");
  });

  test("maps SUPERSEDED to Histórico", () => {
    expect(getSharingAgreementStatusLabel(SharingAgreementResponseStatus.SUPERSEDED)).toBe("Histórico");
  });

  test("falls back to a visible label for undefined status", () => {
    expect(getSharingAgreementStatusLabel(undefined)).toBe("Desconocido");
  });
});
