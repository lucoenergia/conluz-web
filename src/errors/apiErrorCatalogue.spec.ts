import { describe, expect, it } from "vitest";
import type { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorMessage, getGroupedApiErrorDetails, translateErrorDetail } from "./apiErrorCatalogue";

const DISTRIBUTOR_FILE_CODES: RestErrorDetailCode[] = [
  "DISTRIBUTOR_FILE_LINE_MALFORMED",
  "DISTRIBUTOR_FILE_CUPS_UNKNOWN",
  "DISTRIBUTOR_FILE_CUPS_LENGTH_INVALID",
  "DISTRIBUTOR_FILE_CUPS_DUPLICATE",
  "DISTRIBUTOR_FILE_VALUE_DECIMAL_SEPARATOR_INVALID",
  "DISTRIBUTOR_FILE_VALUE_SCALE_INVALID",
  "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID",
  "DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID",
  "DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH",
  "DISTRIBUTOR_FILE_PLANT_REGULATORY_CODE_MISSING",
];

describe("translateErrorDetail", () => {
  it("returns the fallback when detail is null or undefined", () => {
    expect(translateErrorDetail(null, "fallback")).toBe("fallback");
    expect(translateErrorDetail(undefined, "fallback")).toBe("fallback");
  });

  it("returns the registered Spanish template for a known code", () => {
    expect(
      translateErrorDetail({ message: "not draft", code: "SHARING_AGREEMENT_NOT_DRAFT" }, "fallback"),
    ).toBe("Este acuerdo ya no está en borrador, así que esta acción no está disponible.");
  });

  it("falls back to detail.message when code is null", () => {
    expect(translateErrorDetail({ message: "server message", code: undefined }, "fallback")).toBe("server message");
  });

  it("falls back to detail.message when code has no registered template", () => {
    expect(
      translateErrorDetail({ message: "server message", code: "PLANT_MISSING_REGULATORY_CODE" }, "fallback"),
    ).toBe("server message");
  });

  it("falls back to the fallback when code is unrecognised and message is empty", () => {
    expect(translateErrorDetail({ message: "", code: undefined }, "fallback")).toBe("fallback");
  });
});

describe("getFirstApiErrorMessage", () => {
  it("translates the first detail from a RestError response", () => {
    const error = {
      response: {
        data: {
          errors: [{ message: "not draft", code: "SHARING_AGREEMENT_NOT_DRAFT" }],
        },
      },
    };
    expect(getFirstApiErrorMessage(error, "fallback")).toBe(
      "Este acuerdo ya no está en borrador, así que esta acción no está disponible.",
    );
  });

  it("returns the fallback when there is no RestError body", () => {
    expect(getFirstApiErrorMessage(new Error("network error"), "fallback")).toBe("fallback");
    expect(getFirstApiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("returns the fallback when errors array is empty", () => {
    const error = { response: { data: { errors: [] } } };
    expect(getFirstApiErrorMessage(error, "fallback")).toBe("fallback");
  });
});

describe("distributor-file and sharing-agreement error templates", () => {
  it.each(DISTRIBUTOR_FILE_CODES)("translates %s to a non-empty Spanish message, distinct from the raw server message", (code) => {
    const message = translateErrorDetail({ message: "raw server message", code, params: { line: "3", cups: "ES1234" } }, "fallback");
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_COEFFICIENT_SUM_INVALID" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("interpolates the actual filename into DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID, with no leftover placeholder", () => {
    const message = translateErrorDetail(
      {
        message: "raw server message",
        code: "DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID",
        params: { filename: "ABC123_2025.txt" },
      },
      "fallback",
    );
    expect(message).toContain("ABC123_2025.txt");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("interpolates expected/actual into DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH, with no leftover placeholder", () => {
    const message = translateErrorDetail(
      {
        message: "raw server message",
        code: "DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH",
        params: { expected: "ES0031406319070001XX", actual: "ES0031406319070002YY" },
      },
      "fallback",
    );
    expect(message).toContain("ES0031406319070001XX");
    expect(message).toContain("ES0031406319070002YY");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("translates SHARING_AGREEMENT_HAS_NO_COEFFICIENTS to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_HAS_NO_COEFFICIENTS" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_PUBLISHED to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_NOT_PUBLISHED" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_REVERTIBLE to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_NOT_REVERTIBLE" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS to a non-empty Spanish message, distinct from the raw server message", () => {
    const message = translateErrorDetail(
      { message: "raw server message", code: "SHARING_AGREEMENT_HAS_APPLIED_COEFFICIENTS" },
      "fallback",
    );
    expect(message).not.toBe("");
    expect(message).not.toBe("raw server message");
  });

  it("translates SHARING_AGREEMENT_NOT_PUBLISHED and SHARING_AGREEMENT_NOT_REVERTIBLE distinctly, since either may be the real revert-to-draft 'not PUBLISHED' code", () => {
    const notPublished = translateErrorDetail({ message: "raw", code: "SHARING_AGREEMENT_NOT_PUBLISHED" }, "fallback");
    const notRevertible = translateErrorDetail({ message: "raw", code: "SHARING_AGREEMENT_NOT_REVERTIBLE" }, "fallback");
    expect(notPublished).not.toBe(notRevertible);
  });

  it("translates SHARING_AGREEMENT_DUPLICATE_SUPPLY distinctly from DISTRIBUTOR_FILE_CUPS_DUPLICATE", () => {
    const manual = translateErrorDetail(
      { message: "raw", code: "SHARING_AGREEMENT_DUPLICATE_SUPPLY" },
      "fallback",
    );
    const fromFile = translateErrorDetail(
      { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_DUPLICATE", params: { line: "1", cups: "ES1" } },
      "fallback",
    );
    expect(manual).not.toBe(fromFile);
  });
});

const LIFECYCLE_CODES: RestErrorDetailCode[] = [
  "SHARING_AGREEMENT_DATE_IN_FUTURE",
  "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
  "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_BEFORE_SUCCESSOR",
  "SHARING_AGREEMENT_CLOSURE_DATE_NOT_AFTER_ACTIVATION",
  "SHARING_AGREEMENT_COEFFICIENT_NOT_ACTIVE",
  "SHARING_AGREEMENT_COEFFICIENT_HAS_SUCCESSOR",
  "SHARING_AGREEMENT_COEFFICIENT_NOT_IN_AGREEMENT",
];

describe("coefficient-lifecycle error templates (activate/deactivate/close/reopen)", () => {
  it.each(LIFECYCLE_CODES)("translates %s to a non-empty Spanish message naming the supply when params.cups is present", (code) => {
    const withCups = translateErrorDetail({ message: "raw", code, params: { cups: "ES1234000000000001JN0F" } }, "fallback");
    const withoutCups = translateErrorDetail({ message: "raw", code }, "fallback");

    expect(withCups).not.toBe("");
    expect(withCups).not.toBe("raw");
    expect(withCups).toContain("ES1234000000000001JN0F");

    expect(withoutCups).not.toBe("");
    expect(withoutCups).not.toBe("raw");
    // The two variants must differ (the cups-present one names the supply)
    // but neither may ever leak a literal, un-substituted placeholder.
    expect(withoutCups).not.toBe(withCups);
  });

  it.each(LIFECYCLE_CODES)("never renders a literal {cups} placeholder for %s when params.cups is absent", (code) => {
    const message = translateErrorDetail({ message: "raw", code }, "fallback");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it.each(LIFECYCLE_CODES)("never renders a literal {cups} placeholder for %s when params is present but cups is empty", (code) => {
    const message = translateErrorDetail({ message: "raw", code, params: { coefficientId: "c1" } }, "fallback");
    expect(message).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("a batch rejection with three lifecycle details renders three distinct messages, not one", () => {
    const error = {
      response: {
        data: {
          errors: [
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES1111111111111111AA", coefficientId: "c1" },
            },
            {
              message: "raw",
              code: "SHARING_AGREEMENT_ACTIVATION_DATE_NOT_AFTER_PREDECESSOR",
              params: { cups: "ES2222222222222222BB", coefficientId: "c2" },
            },
            { message: "raw", code: "SHARING_AGREEMENT_DATE_IN_FUTURE", params: { coefficientId: "c3" } },
          ],
        },
      },
    };
    // No detail carries params.line, so every one lands in the flat
    // "ungrouped" fileLevel bucket — exactly the N-details -> N-messages
    // list a batch rejection needs.
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(3);
    expect(grouped.lineLevel).toHaveLength(0);
    expect(new Set(grouped.fileLevel).size).toBe(3);
  });
});

describe("getGroupedApiErrorDetails", () => {
  it("partitions details by the presence of params.line", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "2" } },
          ],
        },
      },
    };
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(1);
    expect(grouped.lineLevel).toHaveLength(1);
    expect(grouped.lineLevel[0].line).toBe(2);
  });

  it("orders line-level entries numerically, not lexicographically (line 10 after line 9)", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "10" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "2" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "9" } },
          ],
        },
      },
    };
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.lineLevel.map((entry) => entry.line)).toEqual([2, 9, 10]);
  });

  it("does not throw and still renders an entry whose params.line is missing entirely (grouped as file-level)", () => {
    const error = {
      response: {
        data: {
          errors: [{ message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: {} }],
        },
      },
    };
    expect(() => getGroupedApiErrorDetails(error)).not.toThrow();
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.fileLevel).toHaveLength(1);
    expect(grouped.lineLevel).toHaveLength(0);
  });

  it("does not throw and still renders an entry whose params.line is unparseable, sorted to the end of line-level", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "not-a-number" } },
            { message: "raw", code: "DISTRIBUTOR_FILE_LINE_MALFORMED", params: { line: "1" } },
          ],
        },
      },
    };
    expect(() => getGroupedApiErrorDetails(error)).not.toThrow();
    const grouped = getGroupedApiErrorDetails(error);
    expect(grouped.lineLevel.map((entry) => entry.line)).toEqual([1, null]);
  });

  it("returns empty groups when there is no RestError body", () => {
    expect(getGroupedApiErrorDetails(new Error("network error"))).toEqual({ fileLevel: [], lineLevel: [] });
  });
});
