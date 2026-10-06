import { describe, expect, it } from "vitest";
import { SharingAgreementResponseStatus } from "../../../api/models";
import { buildSharingAgreement } from "../../../test/fixtures";
import { plantAgreementStatus } from "./plantAgreementStatus";

const { DRAFT, PUBLISHED, SUPERSEDED } = SharingAgreementResponseStatus;

const agreement = (id: string, status: SharingAgreementResponseStatus, name = `Agreement ${id}`) =>
  buildSharingAgreement({ id, status, name });

describe("plantAgreementStatus", () => {
  it("is none for a plant that has never had an agreement", () => {
    expect(plantAgreementStatus([])).toEqual({ kind: "none" });
  });

  it("is draft for a plant whose only agreement is being prepared", () => {
    expect(plantAgreementStatus([agreement("a1", DRAFT)])).toEqual({ kind: "draft" });
  });

  it("is ended for a plant whose agreements have all been superseded", () => {
    expect(plantAgreementStatus([agreement("a1", SUPERSEDED), agreement("a2", SUPERSEDED)])).toEqual({ kind: "ended" });
  });

  it("is in force, naming the published agreement", () => {
    expect(plantAgreementStatus([agreement("a1", PUBLISHED, "Reparto 2026")])).toEqual({
      kind: "in-force",
      names: ["Reparto 2026"],
    });
  });

  it("puts an agreement in force above drafts and past agreements, and names only the published ones", () => {
    const agreements = [
      agreement("a1", SUPERSEDED, "Reparto 2025"),
      agreement("a2", PUBLISHED, "Reparto 2026"),
      agreement("a3", DRAFT, "Reparto 2027"),
    ];
    expect(plantAgreementStatus(agreements)).toEqual({ kind: "in-force", names: ["Reparto 2026"] });
  });

  it("puts a draft above past agreements", () => {
    expect(plantAgreementStatus([agreement("a1", SUPERSEDED), agreement("a2", DRAFT)])).toEqual({ kind: "draft" });
  });
});
