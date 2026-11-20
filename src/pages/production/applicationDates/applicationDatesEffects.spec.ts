import { describe, expect, it } from "vitest";
import type { SharingAgreementReferenceResponse } from "../../../api/models";
import {
  AgreementStatusChangeResponseStatusAfter,
  AgreementStatusChangeResponseStatusBefore,
  LeavingClosureChangeResponseSource,
  SharingAgreementReferenceResponseStatus,
  type CoefficientDatesEffectsResponse,
} from "../../../api/models";
import { isBeforeSentDate, writtenEffectSentences } from "./applicationDatesEffects";

const PREVIOUS: SharingAgreementReferenceResponse = { id: "initial", name: "Reparto inicial 2023", status: SharingAgreementReferenceResponseStatus.SUPERSEDED };
const MIGRATION: SharingAgreementReferenceResponse = { id: "migration", name: "Migración", status: SharingAgreementReferenceResponseStatus.PUBLISHED };
const supply = (id: string, name: string | null) => ({ id, code: `ES00310000000000${id}AA`, name });

/** Madrid midnight of a winter day, as the backend writes the instant. */
const midnight = (day: string) => `${new Date(`${day}T00:00:00+01:00`).toISOString().slice(0, 19)}Z`;

const period = (id: string, from: string) => ({
  coefficient: { id },
  supply: supply(id, `Punto ${id}`),
  validFromBefore: null,
  validFromAfter: midnight(from),
  validToBefore: null,
  validToAfter: null,
});

const empty: CoefficientDatesEffectsResponse = {
  coefficients: [],
  neighbours: [],
  leavingClosures: [],
  agreementStatuses: [],
  communityStart: { before: null, after: null },
};

describe("writtenEffectSentences", () => {
  it("UI-AGR-035: counts the coefficients by the day each now starts on, in the order they came", () => {
    const sentences = writtenEffectSentences({
      ...empty,
      coefficients: [period("1", "2024-02-01"), period("2", "2024-02-15"), period("3", "2024-02-01"), period("4", "2024-02-14")],
    });

    expect(sentences).toEqual([
      "4 coeficientes tienen ya fecha de aplicación: 2 desde el 01/02/2024, 1 desde el 15/02/2024 y 1 desde el 14/02/2024.",
    ]);
  });

  it("UI-AGR-035: groups the neighbours by agreement and new end, an open end said as such", () => {
    const neighbour = (id: string, agreement: SharingAgreementReferenceResponse, end: string | null) => ({
      coefficient: { id },
      sharingAgreement: agreement,
      supply: supply(id, null),
      validToBefore: null,
      validToAfter: end && midnight(end),
    });
    const sentences = writtenEffectSentences({
      ...empty,
      neighbours: [
        neighbour("1", PREVIOUS, "2024-02-01"),
        neighbour("2", PREVIOUS, "2024-02-01"),
        neighbour("3", MIGRATION, null),
      ],
    });

    expect(sentences).toEqual([
      "2 coeficientes de Reparto inicial 2023 terminan ahora el 01/02/2024.",
      "1 coeficiente de Migración queda sin fecha de fin.",
    ]);
  });

  it("UI-AGR-035: states each closure, each status that changed and the new community start", () => {
    const sentences = writtenEffectSentences({
      ...empty,
      leavingClosures: [
        {
          coefficient: { id: "bar" },
          sharingAgreement: PREVIOUS,
          supply: supply("9", "Bar La Plaza"),
          source: LeavingClosureChangeResponseSource.DEFAULT,
          validToBefore: null,
          validToAfter: midnight("2024-02-01"),
        },
      ],
      agreementStatuses: [
        {
          sharingAgreement: PREVIOUS,
          statusBefore: AgreementStatusChangeResponseStatusBefore.PUBLISHED,
          statusAfter: AgreementStatusChangeResponseStatusAfter.SUPERSEDED,
        },
        {
          sharingAgreement: MIGRATION,
          statusBefore: AgreementStatusChangeResponseStatusBefore.PUBLISHED,
          statusAfter: AgreementStatusChangeResponseStatusAfter.PUBLISHED,
        },
      ],
      communityStart: { before: null, after: midnight("2023-04-05") },
    });

    expect(sentences).toEqual([
      "Bar La Plaza sale del reparto: su coeficiente se ha cerrado el 01/02/2024.",
      "Reparto inicial 2023: Vigente → Histórico.",
      "La fecha de inicio de la comunidad pasa a ser el 05/04/2023.",
    ]);
  });

  it("UI-AGR-035: says nothing for a write that changed nothing", () => {
    expect(writtenEffectSentences(empty)).toEqual([]);
  });
});

describe("isBeforeSentDate", () => {
  it("UI-AGR-034: compares the day the instant names in Madrid with the sent date, never the UTC prefix", () => {
    // Madrid midnight of 10/02/2025 is 09/02 in UTC: the same day as the sent date, not before it.
    expect(isBeforeSentDate(midnight("2025-02-10"), "2025-02-10")).toBe(false);
    expect(isBeforeSentDate(midnight("2025-02-09"), "2025-02-10")).toBe(true);
    expect(isBeforeSentDate(midnight("2025-02-09"), null)).toBe(false);
  });
});
