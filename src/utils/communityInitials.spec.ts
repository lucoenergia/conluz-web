import { describe, expect, test } from "vitest";
import { communityInitials } from "./communityInitials";

describe("communityInitials", () => {
  test.each([
    ["Comunidad Energética de Luco", "CE"],
    ["Luco", "LU"],
    ["la Solana", "SO"],
    ["  energía   verde  ", "EV"],
    ["Ángel Ávila", "ÁÁ"],
    ["de la", "DL"],
  ])("%s → %s", (name, expected) => {
    expect(communityInitials(name)).toBe(expected);
  });

  test("an empty or missing name has a placeholder", () => {
    expect(communityInitials("")).toBe("?");
    expect(communityInitials(undefined)).toBe("?");
  });
});
