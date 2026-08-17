import { describe, expect, it } from "vitest";
import { parseContentDispositionFilename } from "./downloadSharingAgreementFile";

describe("parseContentDispositionFilename", () => {
  it("parses a plain quoted filename", () => {
    expect(parseContentDispositionFilename('attachment; filename="reparto.pdf"')).toBe("reparto.pdf");
  });

  it("parses a plain unquoted filename", () => {
    expect(parseContentDispositionFilename("attachment; filename=reparto.pdf")).toBe("reparto.pdf");
  });

  it("parses an RFC 5987 encoded filename, decoding percent-escapes", () => {
    expect(parseContentDispositionFilename("attachment; filename*=UTF-8''reparto%20a%C3%B1o.pdf")).toBe(
      "reparto año.pdf",
    );
  });

  it("prefers the encoded form when both are present", () => {
    const header = "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''real.pdf";
    expect(parseContentDispositionFilename(header)).toBe("real.pdf");
  });

  it("returns undefined for a missing header", () => {
    expect(parseContentDispositionFilename(undefined)).toBeUndefined();
  });

  it("returns undefined for an unparseable header", () => {
    expect(parseContentDispositionFilename("attachment")).toBeUndefined();
  });
});
