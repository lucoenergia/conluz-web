import { useState, type ChangeEvent, type ReactNode } from "react";
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
import type { RestErrorDetailCode } from "../../api/models";
import type { Action } from "../../hooks/actions";
import { CommunityScopeHeader } from "../CommunityScopeHeader";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import { radii } from "../../theme/tokens";
import { Notice } from "../Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";
import { ActionStatus } from "../ActionStatus";
import type { CsvImportColumn } from "./csvImport";

/** What an import answers: how many rows failed, and one result per row, by line. */
export interface CsvImportResult {
  failed: number;
  rows: { line: number; outcome: string }[];
}

/** The import's result, or its refusal. */
export type CsvImportOutcome<R> = { ok: true; value: R } | { error: unknown };

export interface CsvImportDialogProps<R extends CsvImportResult> {
  communityName: string | undefined;
  /** What is imported, as the title says it: "Importar miembros" reads "Importar miembros en <comunidad>". */
  title: string;
  /** The action itself: the dialog is mounted only when the community grants it. */
  run: Action<[{ file: Blob }], CsvImportOutcome<R>>;
  /** The guide's notes, as list items. */
  notes: ReactNode;
  columns: readonly CsvImportColumn[];
  onDownloadTemplate: () => void;
  /** The refusals that mean the file was refused as a whole, and nothing was imported. */
  wholeFileCodes: readonly RestErrorDetailCode[];
  /** Said after a whole-file refusal, e.g. "No se ha registrado ningún miembro." */
  nothingImported: string;
  /** Shown while the import runs. */
  progress: string;
  /** What the import did, in one sentence: shown as the result's note and announced. */
  summaryOf: (result: R) => string;
  /** The heading of the failed rows' list. */
  failedRowsHeading: string;
  rowReason: (row: R["rows"][number]) => string;
  /** Anything the result says after the failed rows. */
  resultNote?: (result: R) => ReactNode;
  /** Called once the import answers with a result, whether or not some rows failed. */
  onImported?: (result: R) => void;
  onClose: () => void;
}

const GENERIC_FAILURE = "No se ha podido importar el archivo. Inténtalo de nuevo.";

/**
 * Imports the rows of a CSV file into a community: a guide to the columns, a
 * template, the import, and its result row by row. Mounted on open, so every
 * opening starts from the guide.
 */
export function CsvImportDialog<R extends CsvImportResult>({
  communityName,
  title,
  run,
  notes,
  columns,
  onDownloadTemplate,
  wholeFileCodes,
  nothingImported,
  progress,
  summaryOf,
  failedRowsHeading,
  rowReason,
  resultNote,
  onImported,
  onClose,
}: CsvImportDialogProps<R>) {
  const community = communityLabel(communityName);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [refusal, setRefusal] = useState<{ message: string; nothingImported: boolean } | null>(null);
  const [result, setResult] = useState<R | null>(null);

  /** The refusal's message, and whether it is known that nothing was imported. */
  const refusalOf = (error: unknown) => {
    const code = getFirstApiErrorCode(error);
    if (code && wholeFileCodes.includes(code)) {
      return { message: getFirstApiErrorMessage(error, GENERIC_FAILURE), nothingImported: true };
    }
    return { message: GENERIC_FAILURE, nothingImported: false };
  };

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
    const outcome = await run.run({ file });
    setImporting(false);
    if ("ok" in outcome) {
      setResult(outcome.value);
      onImported?.(outcome.value);
    } else {
      setRefusal(refusalOf(outcome.error));
    }
  };

  const importAnother = () => {
    setResult(null);
    setFile(null);
    setRefusal(null);
  };

  const failedRows = result ? result.rows.filter((row) => row.outcome === "FAILED") : [];

  return (
    <Dialog
      open
      // The import can take several seconds, and closing would hide its result.
      {...inFlightDialogProps(importing, onClose)}
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ px: 3, pt: 2.5 }}>
        <CommunityScopeHeader name={communityName} />
      </Box>
      <DialogTitle sx={{ pt: 0 }}>
        {title} en {community}
      </DialogTitle>

      {importing ? (
        <DialogContent>
          <Box role="status" sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress aria-hidden />
            <Typography variant="body2" sx={{ textAlign: "center" }}>
              {progress}
            </Typography>
          </Box>
        </DialogContent>
      ) : result ? (
        <>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Notice severity={result.failed > 0 ? "warning" : "success"}>{summaryOf(result)}</Notice>

            {failedRows.length > 0 && (
              <Box>
                <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
                  {failedRowsHeading}
                </Typography>
                <Box
                  component="ul"
                  aria-label={failedRowsHeading}
                  sx={{
                    m: 0,
                    pl: 2.5,
                    maxHeight: 280,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
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

            {resultNote?.(result)}
          </DialogContent>
          <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
            <Button onClick={importAnother}>Importar otro archivo</Button>
            <Button onClick={onClose} variant="contained">
              Cerrar
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {refusal && (
              <Alert severity="error">
                {refusal.message}
                {refusal.nothingImported && ` ${nothingImported}`}
              </Alert>
            )}
            <Notice severity="info">
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {notes}
              </Box>
            </Notice>

            <Box>
              <Typography component="h3" variant="subtitle2" sx={{ mb: 1 }}>
                Columnas del archivo
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                La primera fila tiene que llevar estas cabeceras, tal cual, en cualquier orden.
              </Typography>
              <Box component="ul" aria-label="Columnas del archivo" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {columns.map((column) => (
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
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onDownloadTemplate}>
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
      {/* In place from the moment the dialog opens, so the result is announced.
          Last, so it does not separate the title from the content: MUI pads the
          content less when it follows the title directly. */}
      <ActionStatus message={result ? summaryOf(result) : ""} />
    </Dialog>
  );
}
