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

  it("leaves the error as it is when its body is not a Blob", async () => {
    const network = new Error("network error");
    const json = { response: { status: 409, data: { errors: [] } } };

    expect(await withParsedBlobErrorBody(network)).toBe(network);
    expect(await withParsedBlobErrorBody(json)).toBe(json);
    expect(await withParsedBlobErrorBody(undefined)).toBeUndefined();
  });
});
