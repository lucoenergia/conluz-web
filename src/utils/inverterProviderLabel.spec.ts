import { describe, expect, it } from "vitest";
import { PlantResponseInverterProvider } from "../api/models";
import { inverterProviderLabel } from "./inverterProviderLabel";

describe("inverterProviderLabel", () => {
  it("UI-PLS-001 names Huawei by its name, not its code", () => {
    expect(inverterProviderLabel(PlantResponseInverterProvider.HUAWEI)).toBe("Huawei");
  });

  it("names every provider the API defines", () => {
    for (const provider of Object.values(PlantResponseInverterProvider)) {
      expect(inverterProviderLabel(provider)).toEqual(expect.any(String));
      expect(inverterProviderLabel(provider)).not.toBe(provider);
    }
  });
});
