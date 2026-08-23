import { describe, expect, it } from "vitest";
import { formatDecimalForInput, parseDecimalInput } from "./parseDecimalInput";

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
