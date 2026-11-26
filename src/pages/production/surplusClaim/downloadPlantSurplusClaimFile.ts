import { GetPlantSurplusClaimFileFormat } from "../../../api/models";
import { downloadFile, type FileDownloadResult } from "../../../http/downloadFile";

/** The extension of each format's file, for a name the server does not give. */
const EXTENSIONS: Record<GetPlantSurplusClaimFileFormat, string> = {
  [GetPlantSurplusClaimFileFormat.ENDESA]: "zip",
  [GetPlantSurplusClaimFileFormat.GENERIC]: "csv",
};

/**
 * Downloads a plant's surplus claim file for one month in one format, under
 * the name the server gives it. Bypasses the generated `getPlantSurplusClaimFile`,
 * whose `customInstance` wrapper discards Content-Disposition.
 */
export function downloadPlantSurplusClaimFile(
  plantId: string,
  month: string,
  format: GetPlantSurplusClaimFileFormat,
): Promise<FileDownloadResult> {
  return downloadFile(`/api/v1/plants/${plantId}/surplus-claim/file`, {
    params: { month, format },
    defaultFilename: `reclamacion-excedentes-${month}.${EXTENSIONS[format]}`,
  });
}
