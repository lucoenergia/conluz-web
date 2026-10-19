/**
 * Triggers a browser save-as for an in-memory blob via a throwaway anchor element.
 *
 * Shared by every screen that hands the user a file: the sharing agreement's
 * attached and generated files, and the member import's template (#284).
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
