import { describe, it, expect } from "vitest";
import { deriveStatus, computeOverview } from "./usePlatformOverview";
import type { CommunityResponse } from "../../api/models";

const community = (overrides: Partial<CommunityResponse>): CommunityResponse => ({
  id: "id",
  name: "Community",
  enabled: true,
  adminNames: ["Admin One"],
  memberCount: 5,
  supplyPointCount: 3,
  ...overrides,
});

describe("deriveStatus", () => {
  it("returns Activa for an enabled community with members and admins", () => {
    expect(deriveStatus(community({}))).toBe("Activa");
  });

  it("returns Deshabilitada when enabled is false — even with members and admins", () => {
    expect(deriveStatus(community({ enabled: false }))).toBe("Deshabilitada");
  });

  it("disabled wins over every other signal (no disabled community reads Activa)", () => {
    expect(
      deriveStatus(community({ enabled: false, memberCount: 0, adminNames: [] })),
    ).toBe("Deshabilitada");
  });

  it("returns Sin usuarios when memberCount is 0", () => {
    expect(deriveStatus(community({ memberCount: 0 }))).toBe("Sin usuarios");
  });

  it("treats a missing memberCount as zero members", () => {
    expect(deriveStatus(community({ memberCount: undefined }))).toBe("Sin usuarios");
  });

  it("returns Sin admin when adminNames is empty but there are members", () => {
    expect(deriveStatus(community({ adminNames: [] }))).toBe("Sin admin");
  });

  it("returns Sin admin when adminNames is missing but there are members", () => {
    expect(deriveStatus(community({ adminNames: undefined }))).toBe("Sin admin");
  });
});

describe("computeOverview", () => {
  it("returns zeroed KPIs and attention for an empty list", () => {
    const { kpis, attention } = computeOverview([]);
    expect(kpis).toEqual({
      communities: 0,
      communitiesWithUsers: 0,
      communitiesWithoutUsers: 0,
      supplyPoints: 0,
      members: 0,
    });
    expect(attention).toEqual({ withoutAdmin: 0, withoutUsers: 0, disabled: 0 });
  });

  it("aggregates KPIs across communities", () => {
    const { kpis } = computeOverview([
      community({ memberCount: 10, supplyPointCount: 4 }),
      community({ memberCount: 0, supplyPointCount: 6 }),
      community({ memberCount: 2, supplyPointCount: 0 }),
    ]);
    expect(kpis.communities).toBe(3);
    expect(kpis.communitiesWithUsers).toBe(2);
    expect(kpis.communitiesWithoutUsers).toBe(1);
    expect(kpis.supplyPoints).toBe(10);
    // Socios = Σ memberCount (memberships), not distinct people.
    expect(kpis.members).toBe(12);
  });

  it("counts attention signals independently — one community may match several", () => {
    const { attention } = computeOverview([
      community({ enabled: false, memberCount: 0, adminNames: [] }),
    ]);
    expect(attention).toEqual({ withoutAdmin: 1, withoutUsers: 1, disabled: 1 });
  });

  it("tolerates missing numeric and array fields", () => {
    const { kpis, attention } = computeOverview([
      community({ memberCount: undefined, supplyPointCount: undefined, adminNames: undefined }),
    ]);
    expect(kpis.supplyPoints).toBe(0);
    expect(kpis.members).toBe(0);
    expect(kpis.communitiesWithoutUsers).toBe(1);
    expect(attention.withoutAdmin).toBe(1);
    expect(attention.withoutUsers).toBe(1);
  });
});
