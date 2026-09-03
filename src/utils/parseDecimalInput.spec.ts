import { describe, expect, it } from "vitest";
import { formatDecimalForInput, formatFixedDecimalForInput, parseDecimalInput } from "./parseDecimalInput";

describe("parseDecimalInput", () => {
  it("parses a Spanish decimal comma", () => {
    expect(parseDecimalInput("12,5")).toBe(12.5);
  });

  it("parses a plain dot decimal", () => {
    expect(parseDecimalInput("12.5")).toBe(12.5);
  });

  it("parses a dot-grouped thousands separator with a comma decimal", () => {
    expect(parseDecimalInput("1.234,5")).toBe(1234.5);
  });

  it("parses a plain integer", () => {
    expect(parseDecimalInput("42")).toBe(42);
  });

  it("returns NaN for empty or non-numeric input", () => {
    expect(parseDecimalInput("")).toBeNaN();
    expect(parseDecimalInput("abc")).toBeNaN();
  });

  it("trims surrounding whitespace", () => {
    expect(parseDecimalInput("  12,5  ")).toBe(12.5);
  });
});

describe("formatDecimalForInput", () => {
  it("formats a decimal number with a Spanish comma", () => {
    expect(formatDecimalForInput(12.5)).toBe("12,5");
  });

  it("formats an integer without a separator", () => {
    expect(formatDecimalForInput(42)).toBe("42");
  });
});

describe("formatFixedDecimalForInput", () => {
  it("pads a value with fewer natural decimals to the requested fixed count", () => {
    expect(formatFixedDecimalForInput(0.5, 6)).toBe("0,500000");
    expect(formatFixedDecimalForInput(20, 2)).toBe("20,00");
  });

  it("rounds a value with more natural decimals down to the requested fixed count", () => {
    // The exact bug reported: a raw float division can produce far more
    // digits than the requested precision — must round, not truncate-leak.
    expect(formatFixedDecimalForInput(1.5 / 48.4, 6)).toBe("0,030992");
  });

  it("formats an exact zero padded, not as a bare '0'", () => {
    expect(formatFixedDecimalForInput(0, 6)).toBe("0,000000");
    expect(formatFixedDecimalForInput(0, 2)).toBe("0,00");
  });
});
