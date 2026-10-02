import { describe, expect, it } from "vitest";
import { isSupplyOutsideActiveCommunity } from "./supplyCommunityScope";
import { buildSupply } from "../../test/fixtures";
import type { SupplyResponse } from "../../api/models";

const supplyIn = (communityId: string) =>
  buildSupply({ community: { id: communityId, name: "Community" } });

describe("isSupplyOutsideActiveCommunity", () => {
  it("is false when the supply belongs to the active community", () => {
    expect(isSupplyOutsideActiveCommunity(supplyIn("community-a"), "community-a")).toBe(false);
  });

  it("is true when the supply belongs to another community", () => {
    expect(isSupplyOutsideActiveCommunity(supplyIn("community-b"), "community-a")).toBe(true);
  });

  // Every one of these is "not resolved yet". Treating them as a mismatch would
  // render "Punto de suministro no encontrado" during the first frames of every
  // page load.
  it("is false while the supply is still loading", () => {
    expect(isSupplyOutsideActiveCommunity(undefined, "community-a")).toBe(false);
  });

  it("is false while no community has been selected", () => {
    expect(isSupplyOutsideActiveCommunity(supplyIn("community-a"), null)).toBe(false);
    expect(isSupplyOutsideActiveCommunity(supplyIn("community-a"), undefined)).toBe(false);
  });

  it("is false when the supply carries no community reference at all", () => {
    // Not a shape the current schema produces -- community is required -- but
    // the guard is what stands between a missing field and a false "foreign",
    // so it must not depend on the field being there.
    const withoutCommunity = { ...buildSupply(), community: undefined } as unknown as SupplyResponse;
    expect(isSupplyOutsideActiveCommunity(withoutCommunity, "community-a")).toBe(false);
  });
});
