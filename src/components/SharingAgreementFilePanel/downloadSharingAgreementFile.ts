import { AXIOS_INSTANCE } from "../../api/custom-instance";

const DEFAULT_FILENAME = "acuerdo-de-reparto";

export interface SharingAgreementFileDownloadResult {
  blob: Blob;
  filename: string;
}

/**
 * Downloads the sharing agreement's attached file as binary. Bypasses the
 * generated `useGetSharingAgreementFile` hook, which types the response body
 * as `string` with no `responseType` override and would corrupt the bytes.
 * Goes through the shared AXIOS_INSTANCE directly (same base URL and auth
 * interceptor as every other request) so the Content-Disposition header —
 * discarded by the generated client's `customInstance` wrapper — is readable.
 */
export async function downloadSharingAgreementFile(
  plantId: string,
  sharingAgreementId: string,
): Promise<SharingAgreementFileDownloadResult> {
  const response = await AXIOS_INSTANCE.get(
    `/api/v1/plants/${plantId}/sharing-agreements/${sharingAgreementId}/file`,
    { responseType: "blob" },
  );

  return {
    blob: response.data,
    filename: parseContentDispositionFilename(response.headers["content-disposition"]) ?? DEFAULT_FILENAME,
  };
}

/** Parses the filename from a Content-Disposition header, handling both the plain and RFC 5987 encoded forms. */
export function parseContentDispositionFilename(headerValue: string | undefined): string | undefined {
  if (!headerValue) return undefined;

  const encodedMatch = /filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i.exec(headerValue);
  if (encodedMatch) {
    try {
      return decodeURIComponent(encodedMatch[1].trim());
    } catch {
      // fall through to the plain form below
    }
  }

  const plainMatch = /filename="?([^";]+)"?/i.exec(headerValue);
  return plainMatch ? plainMatch[1].trim() : undefined;
}
