/**
 * A request made with `responseType: "blob"` receives its error body as a Blob
 * too: axios applies the response type to every status, and `customInstance`
 * (src/api/custom-instance.ts) rethrows the AxiosError untouched. The typed
 * `RestError` the catalogue reads is then still JSON text inside that Blob, so
 * every refusal would show the generic fallback instead of its own message
 * (#149, generating the distributor file).
 *
 * Returns the error with `response.data` replaced by the parsed body, or the
 * error itself when there is no Blob body or it is not JSON.
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
