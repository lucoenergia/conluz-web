import { describe, expect, it } from "vitest";
import {
  SharingAgreementPartitionCoefficientResponseEndState,
  type PartitionCoefficientResponse,
} from "../../api/models";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { buildCoefficient, buildPartitionCoefficientCapabilities } from "../../test/fixtures";
import { formatCoefficientPeriodRange } from "./coefficientHistory";
import { getEndStateLabel } from "./sharingAgreementCoefficientState";

// Runs in the `app-time-zone` Vitest project: the device is in New York, so a
// date read in the device's zone instead of Europe/Madrid falls on the day
// before every instant below.

const { DERIVED, CLOSED } = SharingAgreementPartitionCoefficientResponseEndState;

function period(overrides: Partial<PartitionCoefficientResponse>): PartitionCoefficientResponse {
  return {
    id: "p1",
    supply: { id: "s1", code: "ES0031300000000001AB", name: "Vivienda A" },
    community: { id: "community-1", name: "Sol Común" },
    plant: { id: "plant-norte", name: "Planta Solar Norte" },
    sharingAgreement: { id: "sa1", name: "Reparto 2024", status: "PUBLISHED" },
    coefficient: 0.15,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-01-01T00:00:00Z",
    capabilities: buildPartitionCoefficientCapabilities(),
    ...overrides,
  };
}

describe("coefficient end dates are read in Madrid, wherever the device is", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  // The backend stores an end date as the start of its day in Europe/Madrid,
  // the first day the coefficient no longer applies (half-open periods,
  // lucoenergia/conluz#581).
  describe.each([
    { season: "winter", endDate: "2024-12-31T23:00:00Z", long: "1 de enero de 2025", short: "1 ene 2025" },
    { season: "summer", endDate: "2024-05-22T22:00:00Z", long: "23 de mayo de 2024", short: "23 may 2024" },
  ])("UI-AGR-019 an end date at Madrid midnight in $season", ({ endDate, long, short }) => {
    it.each([DERIVED, CLOSED])(`UI-AGR-019 shows a %s end as that day, ${long}`, (endState) => {
      expect(getEndStateLabel(buildCoefficient({ endState, endDate }))).toBe(long);
    });

    it(`UI-AGR-019 ends the history period on that day, ${short}`, () => {
      expect(formatCoefficientPeriodRange(period({ validFrom: "2024-01-01T00:00:00Z", validTo: endDate }))).toBe(
        `1 ene 2024 → ${short}`,
      );
    });
  });

  // Rows backfilled before the backend derived instants in Madrid were stored
  // at 00:00 UTC. These tests record how such a row is shown today (#420).
  describe("a date backfilled at 00:00 UTC (#420)", () => {
    const BACKFILLED = "2024-05-23T00:00:00Z";

    it("shows a backfilled start as 23 May 2024", () => {
      expect(formatCoefficientPeriodRange(period({ validFrom: BACKFILLED, validTo: null }))).toBe("Desde 23 may 2024");
    });

    it("shows a backfilled end as 23 May 2024", () => {
      expect(getEndStateLabel(buildCoefficient({ endState: CLOSED, endDate: BACKFILLED }))).toBe("23 de mayo de 2024");
    });
  });
});
