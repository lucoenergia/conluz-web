import { useState, type FC } from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  GetPlantSurplusClaimFileFormat,
  RestErrorDetailCode,
  type PlantResponse,
  type PlantSurplusClaimResponse,
} from "../../../api/models";
import { ActionStatus } from "../../../components/ActionStatus";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { ConfirmationModal } from "../../../components/Modals/ConfirmationModal";
import { Notice } from "../../../components/Notice";
import { getFirstApiErrorCode } from "../../../errors/apiErrorCatalogue";
import { SURPLUS_CLAIM_CIL_REQUIRED_MESSAGE } from "../../../errors/surplusClaim";
import { usePlantActions } from "../../../hooks/actions";
import { colors } from "../../../theme/tokens";
import { sxStyles } from "../../../theme/sx";
import { monthPhrase, type RaisedWarning } from "./surplusClaimFormat";

const FORMAT_LABELS: Record<GetPlantSurplusClaimFileFormat, string> = {
  ENDESA: "Endesa (Excel en ZIP)",
  GENERIC: "Genérico (CSV)",
};

/**
 * A download that failed, and what it asked for. It describes that request
 * only: once the month, the format or the plant's CIL change, it is forgotten,
 * so a refusal never outlives its cause, even when the change is undone.
 */
interface Failure {
  cilRequired: boolean;
  month: string;
  format: GetPlantSurplusClaimFileFormat;
  cil: string | null;
}

export interface SurplusClaimDownloadProps {
  plant: PlantResponse;
  claim: PlantSurplusClaimResponse;
  /** Another month is loading: the claim shown is not the one selected. */
  isSwitchingMonth: boolean;
  warnings: readonly RaisedWarning[];
  /** Opens the plant's edit form, where its CIL is added. */
  onAddCil: (opener: HTMLElement) => void;
}

/**
 * The format and the download, last in the top summary. The file asked for is
 * always the month shown, never a default (UI-SCL-008). A month with warnings
 * is confirmed first (UI-SCL-009); Endesa's format without a CIL offers the
 * way to add one instead of a download bound to fail (UI-SCL-010).
 */
export const SurplusClaimDownload: FC<SurplusClaimDownloadProps> = ({
  plant,
  claim,
  isSwitchingMonth,
  warnings,
  onAddCil,
}) => {
  const download = usePlantActions().forPlant(plant).actions.downloadSurplusClaim;
  const [format, setFormat] = useState<GetPlantSurplusClaimFileFormat>(GetPlantSurplusClaimFileFormat.ENDESA);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Adjusted while rendering, as React advises for state that follows a prop.
  if (failure && (failure.month !== claim.month || failure.cil !== claim.cil || failure.format !== format)) {
    setFailure(null);
  }

  if (!download) return null;

  const needsCil =
    format === GetPlantSurplusClaimFileFormat.ENDESA && (claim.cil === null || failure?.cilRequired === true);

  const run = async () => {
    const request = { month: claim.month, format, cil: claim.cil };
    setFailure(null);
    const result = await download.run(request.month, request.format);
    if ("error" in result) {
      setFailure({ ...request, cilRequired: getFirstApiErrorCode(result.error) === RestErrorDetailCode.SURPLUS_CLAIM_CIL_REQUIRED });
    }
    setIsConfirmOpen(false);
  };

  const requestDownload = () => {
    if (warnings.length > 0) setIsConfirmOpen(true);
    else void run();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2.5, borderTop: `1px solid ${colors.divider}` }}>
      {/* In place before a refusal arrives, so the CIL notice it brings is announced. */}
      <ActionStatus message={failure?.cilRequired ? SURPLUS_CLAIM_CIL_REQUIRED_MESSAGE : ""} />
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, gap: 2 }}>
        <TextField
          select
          label="Formato"
          value={format}
          onChange={(event) => setFormat(event.target.value as GetPlantSurplusClaimFileFormat)}
          sx={{ ...sxStyles.filterField, width: { xs: "100%", sm: 260 } }}
        >
          {Object.values(GetPlantSurplusClaimFileFormat).map((option) => (
            <MenuItem key={option} value={option}>
              {FORMAT_LABELS[option]}
            </MenuItem>
          ))}
        </TextField>
        {!needsCil && (
          <Button
            variant="contained"
            startIcon={<DownloadOutlinedIcon />}
            disabled={download.isPending || isSwitchingMonth}
            onClick={requestDownload}
          >
            {download.isPending ? "Descargando…" : "Descargar fichero"}
          </Button>
        )}
      </Box>

      {needsCil && (
        <Notice severity="warning">
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
            <span>{SURPLUS_CLAIM_CIL_REQUIRED_MESSAGE}</span>
            <Button variant="outlined" size="small" color="inherit" onClick={(event) => onAddCil(event.currentTarget)}>
              Añadir CIL
            </Button>
          </Box>
        </Notice>
      )}

      {failure && !failure.cilRequired && (
        <LoadErrorAlert message={`No se pudo descargar el fichero de ${monthPhrase(failure.month)}.`} onRetry={() => void run()} />
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void run()}
        confirmLabel="Descargar igualmente"
        confirmColor="primary"
        confirmPending={download.isPending}
        inFlight={download.isPending}
        title="Vas a descargar un fichero incompleto"
      >
        <Box component="ul" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {warnings.map((warning) => (
            <Typography component="li" variant="body2" key={warning.key} sx={{ color: colors.text.body }}>
              {warning.title}
            </Typography>
          ))}
        </Box>
        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600, color: colors.text.primary }}>
          Tú decides si lo envías. Revisa los avisos antes de mandarlo a la comercializadora.
        </Typography>
      </ConfirmationModal>
    </Box>
  );
};
