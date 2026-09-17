import { describe, expect, it } from "vitest";
import { isPlantOutsideActiveCommunity } from "./plantCommunityScope";
import type { PlantResponse } from "../../api/models";

const plantIn = (communityId: string): PlantResponse =>
  ({ id: "plant-1", name: "Plant", community: { id: communityId } }) as PlantResponse;

describe("isPlantOutsideActiveCommunity", () => {
  it("is false when the plant belongs to the active community", () => {
    expect(isPlantOutsideActiveCommunity(plantIn("community-a"), "community-a")).toBe(false);
  });

  it("is true when the plant belongs to another community", () => {
    expect(isPlantOutsideActiveCommunity(plantIn("community-b"), "community-a")).toBe(true);
  });

  // Every one of these is "not resolved yet". Treating them as a mismatch would
  // render "Planta no encontrada" during the first frames of every page load.
  it("is false while the plant is still loading", () => {
    expect(isPlantOutsideActiveCommunity(undefined, "community-a")).toBe(false);
  });

  it("is false while no community has been selected", () => {
    expect(isPlantOutsideActiveCommunity(plantIn("community-a"), null)).toBe(false);
    expect(isPlantOutsideActiveCommunity(plantIn("community-a"), undefined)).toBe(false);
  });

  it("is false when the plant carries no community reference at all", () => {
    expect(isPlantOutsideActiveCommunity({ id: "plant-1" } as PlantResponse, "community-a")).toBe(false);
  });
});
