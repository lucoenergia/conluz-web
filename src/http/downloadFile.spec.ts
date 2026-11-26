import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadSharingAgreementFile } from "../components/SharingAgreementFilePanel/downloadSharingAgreementFile";
import { downloadPlantSurplusClaimFile } from "../pages/production/surplusClaim/downloadPlantSurplusClaimFile";
import { AXIOS_INSTANCE } from "./custom-instance";
import { parseContentDispositionFilename } from "./downloadFile";

/** The response axios resolves a blob request with, as far as a download reads it. */
function serveFile(contentDisposition?: string) {
  const blob = new Blob(["PK"]);
  const headers = contentDisposition ? { "content-disposition": contentDisposition } : {};
  const get = vi.spyOn(AXIOS_INSTANCE, "get").mockResolvedValue({ data: blob, headers });
  return { blob, get };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadFile through its callers", () => {
  it("downloads the sharing agreement file as before: its URL as a blob, under the server's name or its default (#455)", async () => {
    const { blob, get } = serveFile('attachment; filename="reparto.pdf"');

    await expect(downloadSharingAgreementFile("plant-1", "agreement-1")).resolves.toEqual({ blob, filename: "reparto.pdf" });
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/v1/plants/plant-1/sharing-agreements/agreement-1/file", {
      responseType: "blob",
    });

    serveFile();
    await expect(downloadSharingAgreementFile("plant-1", "agreement-1")).resolves.toEqual({
      blob: expect.any(Blob),
      filename: "acuerdo-de-reparto",
    });
  });

  it("UI-SCL-008 asks for the surplus claim file of the month and format given, under the server's name", async () => {
    const { blob, get } = serveFile('attachment; filename="reclamacionMedidas_ES0031405000000001AB1F001_2026-10.zip"');

    await expect(downloadPlantSurplusClaimFile("plant-1", "2026-10", "ENDESA")).resolves.toEqual({
      blob,
      filename: "reclamacionMedidas_ES0031405000000001AB1F001_2026-10.zip",
    });
    expect(get).toHaveBeenCalledExactlyOnceWith("/api/v1/plants/plant-1/surplus-claim/file", {
      responseType: "blob",
      params: { month: "2026-10", format: "ENDESA" },
    });
  });

  it.each([
    ["ENDESA", "reclamacion-excedentes-2026-10.zip"],
    ["GENERIC", "reclamacion-excedentes-2026-10.csv"],
  ] as const)("UI-SCL-008 names a %s file the server does not name after its month, with its format's extension", async (format, filename) => {
    serveFile();

    await expect(downloadPlantSurplusClaimFile("plant-1", "2026-10", format)).resolves.toEqual({
      blob: expect.any(Blob),
      filename,
    });
  });
});

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
