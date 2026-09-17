import { describe, it, expect } from "vitest";
import {
  formatCoefficientPeriodRange,
  groupCoefficientHistoryByPlant,
  isActivePeriod,
  selectAppliedPeriods,
  selectPeriodsInCommunity,
} from "./coefficientHistory";
import type { PartitionCoefficientResponse } from "../../api/models";

const ACTIVE_COMMUNITY = { id: "community-1", name: "Sol Común" };
const PLANT_NORTE = { id: "plant-norte", name: "Planta Solar Norte" };
const PLANT_SUR = { id: "plant-sur", name: "Planta Solar Sur" };

function period(overrides: Partial<PartitionCoefficientResponse>): PartitionCoefficientResponse {
  return {
    id: "p1",
    supply: { id: "s1", code: "ES0031300000000001AB", name: "Vivienda A" },
    community: ACTIVE_COMMUNITY,
    plant: PLANT_NORTE,
    sharingAgreement: { id: "sa1", name: "Reparto 2024", status: "PUBLISHED" },
    coefficient: 0.15,
    validFrom: "2024-01-01T00:00:00Z",
    validTo: null,
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("selectAppliedPeriods", () => {
  it("drops pending periods, which admins receive but which were never in force", () => {
    const applied = period({ id: "applied", validFrom: "2024-01-01T00:00:00Z" });
    const pending = period({ id: "pending", validFrom: null });

    expect(selectAppliedPeriods([applied, pending]).map((p) => p.id)).toEqual(["applied"]);
  });

  it("treats a missing list as empty rather than throwing", () => {
    expect(selectAppliedPeriods(undefined)).toEqual([]);
  });
});

describe("isActivePeriod", () => {
  it("is true only for a period that has started and has no end", () => {
    expect(isActivePeriod(period({ validFrom: "2024-01-01T00:00:00Z", validTo: null }))).toBe(true);
  });

  it("is false for a closed period", () => {
    expect(isActivePeriod(period({ validFrom: "2024-01-01T00:00:00Z", validTo: "2025-01-01T00:00:00Z" }))).toBe(false);
  });

  it("is false for a pending period, which also has no end", () => {
    expect(isActivePeriod(period({ validFrom: null, validTo: null }))).toBe(false);
  });
});

describe("groupCoefficientHistoryByPlant", () => {
  it("splits a two-plant timeline into one group per plant, carrying each plant's name", () => {
    const groups = groupCoefficientHistoryByPlant([
      period({ id: "n1", plant: PLANT_NORTE }),
      period({ id: "s1", plant: PLANT_SUR }),
      period({ id: "n2", plant: PLANT_NORTE, validFrom: "2023-01-01T00:00:00Z", validTo: "2024-01-01T00:00:00Z" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].plant.name).toBe("Planta Solar Norte");
    expect(groups[0].periods.map((p) => p.id)).toEqual(["n1", "n2"]);
    expect(groups[1].plant.name).toBe("Planta Solar Sur");
    expect(groups[1].periods.map((p) => p.id)).toEqual(["s1"]);
  });

  it("orders each group newest first, reversing the endpoint's ascending order", () => {
    const groups = groupCoefficientHistoryByPlant([
      period({ id: "oldest", validFrom: "2023-01-01T00:00:00Z", validTo: "2024-01-01T00:00:00Z" }),
      period({ id: "middle", validFrom: "2024-01-01T00:00:00Z", validTo: "2025-01-01T00:00:00Z" }),
      period({ id: "newest", validFrom: "2025-01-01T00:00:00Z", validTo: null }),
    ]);

    expect(groups[0].periods.map((p) => p.id)).toEqual(["newest", "middle", "oldest"]);
  });

  it("sorts each plant independently, so one plant's dates never reorder another's", () => {
    const groups = groupCoefficientHistoryByPlant([
      period({ id: "norte-old", plant: PLANT_NORTE, validFrom: "2023-01-01T00:00:00Z" }),
      period({ id: "sur-new", plant: PLANT_SUR, validFrom: "2025-01-01T00:00:00Z" }),
      period({ id: "norte-new", plant: PLANT_NORTE, validFrom: "2024-01-01T00:00:00Z" }),
      period({ id: "sur-old", plant: PLANT_SUR, validFrom: "2022-01-01T00:00:00Z" }),
    ]);

    expect(groups[0].periods.map((p) => p.id)).toEqual(["norte-new", "norte-old"]);
    expect(groups[1].periods.map((p) => p.id)).toEqual(["sur-new", "sur-old"]);
  });

  it("returns no groups for an empty timeline", () => {
    expect(groupCoefficientHistoryByPlant([])).toEqual([]);
  });
});

describe("formatCoefficientPeriodRange", () => {
  it("reads as open-ended while the period is still in force", () => {
    expect(formatCoefficientPeriodRange(period({ validFrom: "2025-06-01T00:00:00Z", validTo: null }))).toBe(
      "Desde 1 jun 2025",
    );
  });

  it("prints validTo raw, matching how the agreement table presents the end of coverage", () => {
    expect(
      formatCoefficientPeriodRange(period({ validFrom: "2025-01-01T00:00:00Z", validTo: "2025-06-01T00:00:00Z" })),
    ).toBe("1 ene 2025 → 1 jun 2025");
  });

  it("reads the instant in the app timezone, so a Madrid-midnight start is not shown a day early", () => {
    // 2025-05-31T22:00Z is midnight on 1 June in Europe/Madrid, which is how
    // the backend serialises a LocalDate of 2025-06-01.
    expect(formatCoefficientPeriodRange(period({ validFrom: "2025-05-31T22:00:00Z", validTo: null }))).toBe(
      "Desde 1 jun 2025",
    );
  });
});

describe("selectPeriodsInCommunity", () => {
  const OTHER_COMMUNITY = { id: "community-2", name: "Vecinos del Sur" };

  it("keeps only the periods of the selected community", () => {
    const mine = period({ id: "mine" });
    const theirs = period({ id: "theirs", community: OTHER_COMMUNITY });

    expect(selectPeriodsInCommunity([mine, theirs], ACTIVE_COMMUNITY.id)?.map((p) => p.id)).toEqual(["mine"]);
  });

  it("returns an empty list for a supply belonging entirely to another community", () => {
    // Reachable: /supply-points/:id has no community guard, and the endpoint
    // authorises the supply's owner regardless of which community is active.
    expect(selectPeriodsInCommunity([period({ community: OTHER_COMMUNITY })], ACTIVE_COMMUNITY.id)).toEqual([]);
  });

  it("reports 'not resolved yet' rather than 'nothing matches' when no community is selected", () => {
    // undefined, never [] -- an empty array would render as "this supply has no
    // history", which is a different and wrong claim.
    expect(selectPeriodsInCommunity([period({})], null)).toBeUndefined();
    expect(selectPeriodsInCommunity([period({})], undefined)).toBeUndefined();
  });

  it("stays undefined while the periods themselves are still loading", () => {
    expect(selectPeriodsInCommunity(undefined, ACTIVE_COMMUNITY.id)).toBeUndefined();
  });
});
