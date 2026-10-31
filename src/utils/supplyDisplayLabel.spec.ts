import { describe, expect, it } from "vitest";
import { supplyDisplayLabel } from "./supplyDisplayLabel";

describe("supplyDisplayLabel", () => {
  it("UI-SUP-010 names a supply by its name when it has one", () => {
    expect(supplyDisplayLabel({ name: "Casa", address: "Calle Mayor 1", code: "ES0021000000000000AA" })).toBe("Casa");
  });

  it("UI-SUP-010 names a supply without a name by its address", () => {
    expect(supplyDisplayLabel({ name: null, address: "Calle Mayor 1", code: "ES0021000000000000AA" })).toBe(
      "Calle Mayor 1",
    );
  });

  it("UI-SUP-010 treats a blank name as none", () => {
    expect(supplyDisplayLabel({ name: "  ", address: "Calle Mayor 1", code: "ES0021000000000000AA" })).toBe(
      "Calle Mayor 1",
    );
  });

  it("UI-SUP-010 names a supply reference without a name by its CUPS, since it carries no address", () => {
    expect(supplyDisplayLabel({ name: null, code: "ES0021000000000000AA" })).toBe("ES0021000000000000AA");
  });
});
