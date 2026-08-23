import { describe, expect, it } from "vitest";
import { RestErrorDetailCode } from "../api/models";
import { getFirstApiErrorMessage, translateErrorDetail } from "./apiErrorCatalogue";

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
