import { describe, expect, it } from "vitest";
import { checkPasswordPolicy } from "./passwordPolicy";

describe("checkPasswordPolicy", () => {
  it("accepts 15 to 64 characters", () => {
    expect(checkPasswordPolicy("a".repeat(15))).toBeNull();
    expect(checkPasswordPolicy("a".repeat(64))).toBeNull();
  });

  it("refuses fewer than 15 characters", () => {
    expect(checkPasswordPolicy("a".repeat(14))).toBe("TOO_SHORT");
    expect(checkPasswordPolicy("")).toBe("TOO_SHORT");
  });

  it("refuses more than 64 characters", () => {
    expect(checkPasswordPolicy("a".repeat(65))).toBe("TOO_LONG");
  });

  it("counts code points, not UTF-16 units", () => {
    // 8 emoji are 16 UTF-16 units, which a naive `.length` would accept.
    expect("😀".repeat(8).length).toBe(16);
    expect(checkPasswordPolicy("😀".repeat(8))).toBe("TOO_SHORT");
    // 15 emoji: 15 code points, 30 UTF-16 units, 60 bytes.
    expect(checkPasswordPolicy("😀".repeat(15))).toBeNull();
  });

  it("refuses more than 72 bytes of UTF-8 even within 64 characters", () => {
    // 19 emoji: 19 code points, 76 bytes.
    expect(checkPasswordPolicy("😀".repeat(19))).toBe("TOO_MANY_BYTES");
    // 36 two-byte letters: 72 bytes exactly.
    expect(checkPasswordPolicy("ñ".repeat(36))).toBeNull();
    expect(checkPasswordPolicy("ñ".repeat(37))).toBe("TOO_MANY_BYTES");
  });

  it("counts spaces, including leading and trailing ones", () => {
    expect(checkPasswordPolicy(" ".repeat(15))).toBeNull();
    expect(checkPasswordPolicy("  corta  ")).toBe("TOO_SHORT");
  });
});
