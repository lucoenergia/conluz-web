import { describe, expect, it } from "vitest";
import { buildSharingAgreement } from "../../test/fixtures";
import { buildSharingAgreementUpdateBody } from "./sharingAgreementUpdateBody";

const STORED = buildSharingAgreement({
  name: "Reparto 2025",
  notes: "Nota original",
  nominalPowerKW: 45,
  distributorFileSentOn: "2026-03-01",
});

describe("UI-AGR-021 the update body always carries the current distributor file sent date", () => {
  it("UI-AGR-021 an edit that leaves the date alone sends the stored one", () => {
    expect(buildSharingAgreementUpdateBody(STORED, { name: "Reparto 2025 revisado" })).toEqual({
      name: "Reparto 2025 revisado",
      notes: "Nota original",
      nominalPowerKW: 45,
      distributorFileSentOn: "2026-03-01",
    });
  });

  it("UI-AGR-021 an `undefined` date counts as left alone, not as a clear", () => {
    expect(buildSharingAgreementUpdateBody(STORED, { distributorFileSentOn: undefined })).toHaveProperty(
      "distributorFileSentOn",
      "2026-03-01",
    );
  });

  it("UI-AGR-021 only an explicit null clears it", () => {
    expect(buildSharingAgreementUpdateBody(STORED, { distributorFileSentOn: null })).toHaveProperty(
      "distributorFileSentOn",
      null,
    );
  });

  it("UI-AGR-021 an agreement with no date sends the key as null, never leaves it out", () => {
    const body = buildSharingAgreementUpdateBody({ ...STORED, distributorFileSentOn: null }, { name: "Otro nombre" });

    expect(Object.keys(body)).toContain("distributorFileSentOn");
    expect(body.distributorFileSentOn).toBeNull();
  });

  it("UI-AGR-021 a new date replaces the stored one", () => {
    expect(buildSharingAgreementUpdateBody(STORED, { distributorFileSentOn: "2026-04-15" })).toHaveProperty(
      "distributorFileSentOn",
      "2026-04-15",
    );
  });

  it("clears the notes on an explicit null and keeps them when left alone", () => {
    expect(buildSharingAgreementUpdateBody(STORED, { notes: null }).notes).toBeUndefined();
    expect(buildSharingAgreementUpdateBody(STORED, {}).notes).toBe("Nota original");
  });
});
