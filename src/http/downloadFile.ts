import { AXIOS_INSTANCE } from "./custom-instance";

/*
 * Accepted duplication (#149): the blob endpoints name their file in different
 * places. A download that saves the file under the server's name reads the
 * Content-Disposition header by going around the generated client, through
 * this helper. Generating the distributor file (SharingAgreementGenerateDialog)
 * goes through the generated hook instead, and Orval's `customInstance` keeps
 * only `data` and discards the response headers, so the dialog rebuilds the
 * server's name, {regulatoryCode}_{year}.txt, from values it already holds.
 * Reading the header there would mean changing src/http/custom-instance.ts,
 * which every generated call passes through.
 *
 * Revisit if the backend's naming convention for the generated file changes, if
 * a generated filename ever needs a value the client does not already hold, or
 * if Orval starts exposing the raw response.
 */

export interface FileDownloadResult {
  blob: Blob;
  filename: string;
}

export interface FileDownloadOptions {
  /** Query parameters, serialised by axios as the generated client does. */
  params?: Record<string, string>;
  /** The name to save under when the response names none. */
  defaultFilename: string;
}

/**
 * Downloads a file as binary, under the name the server gives it in
 * Content-Disposition. Goes through the shared AXIOS_INSTANCE directly (same
 * base URL, timeout and auth interceptor as every other request), because the
 * generated client's `customInstance` discards the response headers. A failure
 * rejects with the untouched AxiosError, whose body is a Blob: read it with
 * `withParsedBlobErrorBody` (src/errors/blobErrorBody.ts).
 */
export async function downloadFile(
  url: string,
  { params, defaultFilename }: FileDownloadOptions,
): Promise<FileDownloadResult> {
  const response = await AXIOS_INSTANCE.get(url, {
    responseType: "blob",
    params,
  });

  return {
    blob: response.data,
    filename:
      parseContentDispositionFilename(
        response.headers["content-disposition"],
      ) ?? defaultFilename,
  };
}

/** Parses the filename from a Content-Disposition header, handling both the plain and RFC 5987 encoded forms. */
export function parseContentDispositionFilename(
  headerValue: string | undefined,
): string | undefined {
  if (!headerValue) return undefined;

  const encodedMatch = /filename\*=(?:UTF-8''|utf-8'')?([^;]+)/i.exec(
    headerValue,
  );
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
