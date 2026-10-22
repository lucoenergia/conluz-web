/**
 * A request made with `responseType: "blob"` receives its error body as a Blob
 * too: axios applies the response type to every status, and `customInstance`
 * (src/http/custom-instance.ts) rethrows the AxiosError untouched. The typed
 * `RestError` the catalogue reads is then still JSON text inside that Blob, so
 * every refusal would show the generic fallback instead of its own message
 * (#149, generating the distributor file).
 *
 * Returns the error with `response.data` replaced by the parsed body, or the
 * error itself when there is no Blob body or it cannot be read as JSON. It
 * never throws: a body it cannot parse leaves the real failure in place.
 *
 * Accepted exception (#149): this is parsed at the call site, not in
 * `customInstance`, the same way the Content-Disposition note in
 * src/components/SharingAgreementFilePanel/downloadSharingAgreementFile.ts
 * handles the response headers. `customInstance` hands back only `data` and
 * rethrows failures untouched, and every generated call passes through it, so
 * changing it there has a repo-wide blast radius for one endpoint. The cost is
 * that a new blob endpoint shows the generic fallback for its typed refusals
 * until its caller uses this too.
 *
 * Revisit when a second endpoint needs the same parsing, when `customInstance`
 * changes for any other reason, or if Orval starts exposing the raw response.
 */
export async function withParsedBlobErrorBody(error: unknown): Promise<unknown> {
  const response = (error as { response?: { data?: unknown } } | null | undefined)?.response;
  if (!(response?.data instanceof Blob)) return error;

  try {
    const data: unknown = JSON.parse(await readText(response.data));
    return { ...(error as object), response: { ...response, data } };
  } catch {
    return error;
  }
}

/** `Blob.text()` where there is one; jsdom's Blob has none, so FileReader otherwise. */
function readText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
