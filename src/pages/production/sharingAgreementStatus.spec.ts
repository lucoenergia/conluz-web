import { describe, expect, test } from "vitest";
import { SharingAgreementResponseStatus } from "../../api/models";
import { getSharingAgreementStatusColor, getSharingAgreementStatusLabel } from "./sharingAgreementStatus";

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

describe("getSharingAgreementStatusColor", () => {
  test("maps DRAFT to warning (amber)", () => {
    expect(getSharingAgreementStatusColor(SharingAgreementResponseStatus.DRAFT)).toBe("warning");
  });

  test("maps PUBLISHED to primary (indigo)", () => {
    expect(getSharingAgreementStatusColor(SharingAgreementResponseStatus.PUBLISHED)).toBe("primary");
  });

  test("maps SUPERSEDED to default (neutral grey)", () => {
    expect(getSharingAgreementStatusColor(SharingAgreementResponseStatus.SUPERSEDED)).toBe("default");
  });

  test("falls back to default color for undefined status", () => {
    expect(getSharingAgreementStatusColor(undefined)).toBe("default");
  });
});
