import { downloadFile, type FileDownloadResult } from "../../http/downloadFile";

const DEFAULT_FILENAME = "acuerdo-de-reparto";

export type SharingAgreementFileDownloadResult = FileDownloadResult;

/**
 * Downloads the sharing agreement's attached file as binary. Bypasses the
 * generated `useGetSharingAgreementFile` hook, which types the response body
 * as `string` with no `responseType` override and would corrupt the bytes,
 * and whose `customInstance` wrapper discards Content-Disposition.
 */
export function downloadSharingAgreementFile(
  plantId: string,
  sharingAgreementId: string,
): Promise<SharingAgreementFileDownloadResult> {
  return downloadFile(
    `/api/v1/plants/${plantId}/sharing-agreements/${sharingAgreementId}/file`,
    {
      defaultFilename: DEFAULT_FILENAME,
    },
  );
}
