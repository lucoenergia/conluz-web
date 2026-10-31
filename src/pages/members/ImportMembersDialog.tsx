import type { FC } from "react";
import type { ImportMembersBody, ImportMembersResponse, RestErrorDetailCode } from "../../api/models";
import type { Action, MembershipWriteResult } from "../../hooks/actions";
import { CsvImportDialog } from "../../components/CsvImportDialog";
import { Notice } from "../../components/Notice";
import { pluralize } from "../../utils/pluralize";
import { downloadMemberTemplate, IMPORT_COLUMNS, MAX_IMPORT_ROWS, rowReason } from "./importMembers";

interface ImportMembersDialogProps {
  communityName: string | undefined;
  /** The action itself: the dialog is mounted only when the community grants it. */
  importMembers: Action<[ImportMembersBody], MembershipWriteResult<ImportMembersResponse>>;
  /**
   * Whether the page hands over the send to selected members, which decides
   * where the result points for inviting the members just registered. The
   * import itself never sends anything (#328).
   */
  invitable: boolean;
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

/** What the import did, in one sentence: shown as the result's note and announced. */
function importSummaryOf({ registered, failed }: ImportMembersResponse): string {
  const outcome =
    registered === 0
      ? "No se ha registrado ningún miembro."
      : `Se ${pluralize(registered, "ha", "han")} registrado ${registered} ${pluralize(registered, "miembro", "miembros")}.`;
  return failed > 0 ? `${outcome} ${failed} ${pluralize(failed, "fila tiene", "filas tienen")} errores.` : outcome;
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
  invitable,
  onClose,
}) => (
  <CsvImportDialog
    communityName={communityName}
    title="Importar miembros"
    run={importMembers}
    notes={
      <>
        <li>
          Importar registra a los miembros, pero no les envía nada. Después puedes invitarles uno a uno o
          seleccionando a varios en la lista.
        </li>
        <li>En el DNI/NIE/NIF no importan los espacios, los puntos ni los guiones.</li>
        <li>
          Sirven los dos formatos de Excel: «CSV UTF-8» y «CSV (delimitado por punto y coma)». «Texto Unicode» no
          sirve.
        </li>
        <li>Puedes importar hasta {MAX_IMPORT_ROWS} miembros por archivo.</li>
        <li>
          Puedes volver a importar el mismo archivo sin problema: los miembros ya registrados aparecerán como tales.
        </li>
      </>
    }
    columns={IMPORT_COLUMNS}
    onDownloadTemplate={downloadMemberTemplate}
    wholeFileCodes={WHOLE_FILE_CODES}
    nothingImported="No se ha registrado ningún miembro."
    progress="Importando miembros… Puede tardar unos segundos; no cierres esta ventana."
    summaryOf={importSummaryOf}
    failedRowsHeading="Filas no registradas"
    rowReason={rowReason}
    resultNote={({ registered }) =>
      registered > 0 && (
        <Notice severity="info">
          Todavía no se ha enviado ninguna invitación.
          {invitable
            ? " Para invitarles, selecciónalos en la lista de miembros."
            : " Los miembros registrados aparecen como pendientes."}
        </Notice>
      )
    }
    onClose={onClose}
  />
);
