import type { FC } from "react";
import type { ImportSuppliesBody, ImportSuppliesResponse } from "../../api/models";
import type { Action } from "../../hooks/actions";
import type { CommunityWriteResult } from "../../hooks/actions/useCommunityActions";
import { CsvImportDialog } from "../../components/CsvImportDialog";
import {
  downloadSupplyTemplate,
  MAX_SUPPLY_IMPORT_ROWS,
  SUPPLY_IMPORT_COLUMNS,
  SUPPLY_WHOLE_FILE_CODES,
  supplyImportSummaryOf,
  supplyRowReason,
} from "./importSupplies";

interface ImportSuppliesDialogProps {
  communityName: string | undefined;
  /**
   * The import itself, handed over by whoever may perform it. The action
   * already carries the community it writes into, so the dialog never chooses one.
   */
  importSupplies: Action<[ImportSuppliesBody], CommunityWriteResult<ImportSuppliesResponse>>;
  /** Called once the import answers with a result, so the page can refresh what it lists. */
  onImported?: () => void;
  onClose: () => void;
}

/**
 * Creates the supplies listed in a CSV file, through lucoenergia/conluz#532's
 * import, with the same dialog as the member import: a guide to the columns, a
 * template, the import, and its result row by row.
 *
 * Mounted on open, so every opening starts from the guide.
 */
export const ImportSuppliesDialog: FC<ImportSuppliesDialogProps> = ({
  communityName,
  importSupplies,
  onImported,
  onClose,
}) => (
  <CsvImportDialog
    communityName={communityName}
    title="Importar puntos de suministro"
    run={importSupplies}
    notes={
      <>
        <li>
          El titular de cada punto tiene que ser ya miembro de la comunidad. Si todavía no lo es, importa primero
          los miembros.
        </li>
        <li>
          Sirven los dos formatos de Excel: «CSV UTF-8» y «CSV (delimitado por punto y coma)». «Texto Unicode» no
          sirve.
        </li>
        <li>Puedes importar hasta {MAX_SUPPLY_IMPORT_ROWS} puntos de suministro por archivo.</li>
        <li>
          Puedes volver a importar el mismo archivo sin problema: los puntos que ya existen no se duplican.
        </li>
      </>
    }
    columns={SUPPLY_IMPORT_COLUMNS}
    onDownloadTemplate={downloadSupplyTemplate}
    wholeFileCodes={SUPPLY_WHOLE_FILE_CODES}
    nothingImported="No se ha creado ningún punto de suministro."
    progress="Importando puntos de suministro… Puede tardar unos segundos; no cierres esta ventana."
    summaryOf={supplyImportSummaryOf}
    failedRowsHeading="Filas no creadas"
    rowReason={supplyRowReason}
    onImported={onImported}
    onClose={onClose}
  />
);
