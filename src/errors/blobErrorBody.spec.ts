import { describe, expect, it } from "vitest";
import { getFirstApiErrorMessage } from "./apiErrorCatalogue";
import { withParsedBlobErrorBody } from "./blobErrorBody";

const jsonBlob = (body: unknown) => new Blob([JSON.stringify(body)], { type: "application/json" });

describe("withParsedBlobErrorBody", () => {
  it("parses a JSON error body that arrived as a Blob, so the catalogue can read its code", async () => {
    const error = {
      response: { status: 409, data: jsonBlob({ errors: [{ code: "SHARING_AGREEMENT_NOT_DRAFT", message: "raw" }] }) },
    };

    const parsed = await withParsedBlobErrorBody(error);

    expect(getFirstApiErrorMessage(parsed, "fallback")).toBe(
      "Este acuerdo ya no está en borrador, así que esta acción no está disponible.",
    );
    expect((parsed as { response: { status: number } }).response.status).toBe(409);
  });

  it("leaves the error as it is when the Blob body is not JSON", async () => {
    const error = { response: { status: 502, data: new Blob(["<html>Bad gateway</html>"], { type: "text/html" }) } };

    expect(await withParsedBlobErrorBody(error)).toBe(error);
  });

  it.each([
    ["empty", new Blob([], { type: "application/json" })],
    ["truncated", new Blob(['{"errors":[{"code":"PLANT_MISSING_REG'], { type: "application/json" })],
    ["unreadable", Object.assign(new Blob(["{}"]), { text: () => Promise.reject(new Error("read failed")) })],
  ])("leaves the error as it is when the Blob body is %s, and never throws", async (_, data) => {
    const error = { response: { status: 409, data } };

    await expect(withParsedBlobErrorBody(error)).resolves.toBe(error);
  });

  it("degrades a JSON body with no typed errors to the caller's fallback", async () => {
    const parsed = await withParsedBlobErrorBody({ response: { status: 500, data: jsonBlob({ status: 500 }) } });

    expect(getFirstApiErrorMessage(parsed, "fallback")).toBe("fallback");
  });

  it("leaves the error as it is when its body is not a Blob", async () => {
    const network = new Error("network error");
    const json = { response: { status: 409, data: { errors: [] } } };

    expect(await withParsedBlobErrorBody(network)).toBe(network);
    expect(await withParsedBlobErrorBody(json)).toBe(json);
    expect(await withParsedBlobErrorBody(undefined)).toBeUndefined();
  });
});
