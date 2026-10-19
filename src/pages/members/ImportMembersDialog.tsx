import { useState, type ChangeEvent, type FC } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { ImportMembersBody, ImportMembersResponse, RestErrorDetailCode } from "../../api/models";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { pluralize } from "../../utils/pluralize";
import { radii } from "../../theme/tokens";
import { downloadMemberTemplate, IMPORT_COLUMNS, MAX_IMPORT_ROWS, rowReason } from "./importMembers";

interface ImportMembersDialogProps {
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the community grants it. */
  importMembers: Action<[ImportMembersBody], MembershipWriteResult<ImportMembersResponse>>;
  /**
   * Opens the bulk send, when the community grants it. The import itself never
   * sends anything: this closes the dialog and hands over to the bulk send's own
   * confirmation.
   */
  onSendPending?: () => void;
  onClose: () => void;
}

/** The refusals that mean the file was refused as a whole and nothing was registered. */
const WHOLE_FILE_CODES: readonly RestErrorDetailCode[] = [
  "MEMBERSHIP_IMPORT_INVALID_ENCODING",
  "MEMBERSHIP_IMPORT_AMBIGUOUS_SEPARATOR",
  "MEMBERSHIP_IMPORT_MALFORMED_FILE",
  "MEMBERSHIP_IMPORT_UNKNOWN_HEADERS",
  "MEMBERSHIP_IMPORT_DUPLICATED_HEADERS",
  "MEMBERSHIP_IMPORT_MISSING_HEADERS",
  "MEMBERSHIP_IMPORT_TOO_MANY_ROWS",
];

const GENERIC_FAILURE = "No se ha podido importar el archivo. Inténtalo de nuevo.";

/** The refusal's message, and whether it is known that nothing was registered. */
function refusalOf(error: unknown): { message: string; nothingRegistered: boolean } {
  const code = getFirstApiErrorCode(error);
  if (code && WHOLE_FILE_CODES.includes(code)) {
    return { message: getFirstApiErrorMessage(error, GENERIC_FAILURE), nothingRegistered: true };
  }
  return { message: GENERIC_FAILURE, nothingRegistered: false };
}

/**
 * Registers the members listed in a CSV file (#284), through
 * lucoenergia/conluz#397's import: a guide to the columns, a template, the
 * import, and its result row by row. Nothing is sent to the members.
 *
 * Mounted on open, so every opening starts from the guide.
 */
export const ImportMembersDialog: FC<ImportMembersDialogProps> = ({
  communityName,
  importMembers,
  onSendPending,
  onClose,
}) => {
  const community = communityLabel(communityName);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [refusal, setRefusal] = useState<{ message: string; nothingRegistered: boolean } | null>(null);
  const [result, setResult] = useState<ImportMembersResponse | null>(null);

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    // Cleared so that choosing the same file again, once corrected, still counts.
    event.target.value = "";
    if (!chosen) return;
    setFile(chosen);
    setRefusal(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setRefusal(null);
    setImporting(true);
    const outcome = await importMembers.run({ file });
    setImporting(false);
    if ("ok" in outcome) setResult(outcome.value);
    else setRefusal(refusalOf(outcome.error));
  };

  const importAnother = () => {
    setResult(null);
    setFile(null);
    setRefusal(null);
  };

  return (
    <Dialog
      open
      // The import can take several seconds, and closing would hide its result.
      onClose={importing ? undefined : onClose}
      disableEscapeKeyDown={importing}
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ px: 3, pt: 2.5 }}>
        <CommunityScopeHeader name={communityName} />
      </Box>
      <DialogTitle sx={{ pt: 0 }}>Importar miembros en {community}</DialogTitle>

      {importing ? (
        <DialogContent>
          <Box role="status" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress aria-hidden />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              Importando miembros… Puede tardar unos segundos; no cierres esta ventana.
            </Typography>
          </Box>
        </DialogContent>
      ) : result ? (
        <ImportResult result={result} onSendPending={onSendPending} onImportAnother={importAnother} onClose={onClose} />
      ) : (
        <>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {refusal && (
              <Alert severity="error">
                {refusal.message}
                {refusal.nothingRegistered && " No se ha registrado ningún miembro."}
              </Alert>
            )}
            <Alert severity="info">
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>
                  Importar registra a los miembros, pero no les envía nada. Después puedes invitarles uno a uno o con
                  «Enviar invitaciones pendientes».
                </li>
                <li>En el DNI/NIE/NIF no importan los espacios, los puntos ni los guiones.</li>
                <li>
                  Sirven los dos formatos de Excel: «CSV UTF-8» y «CSV (delimitado por punto y coma)». «Texto
                  Unicode» no sirve.
                </li>
                <li>Puedes importar hasta {MAX_IMPORT_ROWS} miembros por archivo.</li>
                <li>
                  Puedes volver a importar el mismo archivo sin problema: los miembros ya registrados aparecerán
                  como tales.
                </li>
              </Box>
            </Alert>

            <Box>
              <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
                Columnas del archivo
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                La primera fila tiene que llevar estas cabeceras, tal cual, en cualquier orden.
              </Typography>
              <Box component="ul" aria-label="Columnas del archivo" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {IMPORT_COLUMNS.map((column) => (
                  <Box
                    component="li"
                    key={column.header}
                    sx={{ py: 1.25, borderTop: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography component="code" variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {column.header}
                      </Typography>
                      <Typography variant="caption" sx={{ color: column.required ? "primary.main" : "text.secondary" }}>
                        {column.required ? "Obligatoria" : "Opcional"}
                      </Typography>
                    </Box>
                    <Typography variant="body2">{column.meaning}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Ejemplo: {column.example}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadMemberTemplate}>
                Descargar plantilla
              </Button>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                Seleccionar archivo CSV
                <input type="file" accept=".csv,text/csv" hidden onChange={chooseFile} />
              </Button>
            </Box>
            {file && (
              <Box>
                <Chip label={file.name} sx={{ borderRadius: radii.small, maxWidth: "100%" }} />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="contained" onClick={handleImport} disabled={!file}>
              Importar
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

interface ImportResultProps {
  result: ImportMembersResponse;
  onSendPending?: () => void;
  onImportAnother: () => void;
  onClose: () => void;
}

const ImportResult: FC<ImportResultProps> = ({ result, onSendPending, onImportAnother, onClose }) => {
  const failedRows = result.rows.filter((row) => row.outcome === "FAILED");
  const { registered, failed } = result;

  return (
    <>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Alert severity={failed > 0 ? "warning" : "success"}>
          {registered === 0
            ? "No se ha registrado ningún miembro."
            : `Se ${pluralize(registered, "ha", "han")} registrado ${registered} ${pluralize(registered, "miembro", "miembros")}.`}
          {failed > 0 && ` ${failed} ${pluralize(failed, "fila tiene", "filas tienen")} errores.`}
        </Alert>

        {failedRows.length > 0 && (
          <Box>
            <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
              Filas no registradas
            </Typography>
            <Box
              component="ul"
              aria-label="Filas no registradas"
              sx={{ m: 0, pl: 2.5, maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.75 }}
            >
              {failedRows.map((row) => (
                <li key={row.line}>
                  <Typography variant="body2">
                    <strong>Línea {row.line}:</strong> {rowReason(row)}
                  </Typography>
                </li>
              ))}
            </Box>
          </Box>
        )}

        {registered > 0 && (
          <Alert severity="info">
            Todavía no se ha enviado ninguna invitación.
            {onSendPending
              ? " Puedes enviarlas ahora a los miembros pendientes que tienen email de contacto."
              : " Los miembros registrados aparecen como pendientes."}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onImportAnother}>Importar otro archivo</Button>
        <Button onClick={onClose} variant={registered > 0 && onSendPending ? "text" : "contained"}>
          Cerrar
        </Button>
        {registered > 0 && onSendPending && (
          <Button variant="contained" onClick={onSendPending}>
            Enviar invitaciones pendientes
          </Button>
        )}
      </DialogActions>
    </>
  );
};
