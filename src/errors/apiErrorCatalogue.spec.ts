import { describe, expect, it } from "vitest";
import { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorMessage, getGroupedApiErrorDetails, translateErrorDetail } from "./apiErrorCatalogue";

const DISTRIBUTOR_FILE_CODES = [
  RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED,
  RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_UNKNOWN,
  RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_LENGTH_INVALID,
  RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_DUPLICATE,
  RestErrorDetailCode.DISTRIBUTOR_FILE_VALUE_DECIMAL_SEPARATOR_INVALID,
  RestErrorDetailCode.DISTRIBUTOR_FILE_VALUE_SCALE_INVALID,
  RestErrorDetailCode.DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID,
  RestErrorDetailCode.DISTRIBUTOR_FILE_FILENAME_SHAPE_INVALID,
  RestErrorDetailCode.DISTRIBUTOR_FILE_FILENAME_REGULATORY_CODE_MISMATCH,
  RestErrorDetailCode.DISTRIBUTOR_FILE_PLANT_REGULATORY_CODE_MISSING,
];

describe("translateErrorDetail", () => {
  it("returns the fallback when detail is null or undefined", () => {
    expect(translateErrorDetail(null, "fallback")).toBe("fallback");
    expect(translateErrorDetail(undefined, "fallback")).toBe("fallback");
  });

  it("returns the registered Spanish template for a known code", () => {
    expect(
      translateErrorDetail({ message: "not draft", code: RestErrorDetailCode.SHARING_AGREEMENT_NOT_DRAFT }, "fallback"),
    ).toBe("Este acuerdo ya no está en borrador, por lo que no se puede modificar ni eliminar.");
  });

  it("falls back to detail.message when code is null", () => {
    expect(translateErrorDetail({ message: "server message", code: undefined }, "fallback")).toBe("server message");
  });

  it("falls back to detail.message when code has no registered template", () => {
    expect(
      translateErrorDetail({ message: "server message", code: RestErrorDetailCode.PLANT_MISSING_REGULATORY_CODE }, "fallback"),
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
          errors: [{ message: "not draft", code: RestErrorDetailCode.SHARING_AGREEMENT_NOT_DRAFT }],
        },
      },
    };
    expect(getFirstApiErrorMessage(error, "fallback")).toBe(
      "Este acuerdo ya no está en borrador, por lo que no se puede modificar ni eliminar.",
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

  it("translates SHARING_AGREEMENT_DUPLICATE_SUPPLY distinctly from DISTRIBUTOR_FILE_CUPS_DUPLICATE", () => {
    const manual = translateErrorDetail(
      { message: "raw", code: RestErrorDetailCode.SHARING_AGREEMENT_DUPLICATE_SUPPLY },
      "fallback",
    );
    const fromFile = translateErrorDetail(
      { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_CUPS_DUPLICATE, params: { line: "1", cups: "ES1" } },
      "fallback",
    );
    expect(manual).not.toBe(fromFile);
  });
});

describe("getGroupedApiErrorDetails", () => {
  it("partitions details by the presence of params.line", () => {
    const error = {
      response: {
        data: {
          errors: [
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID },
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "2" } },
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
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "10" } },
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "2" } },
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "9" } },
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
          errors: [{ message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: {} }],
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
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "not-a-number" } },
            { message: "raw", code: RestErrorDetailCode.DISTRIBUTOR_FILE_LINE_MALFORMED, params: { line: "1" } },
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
