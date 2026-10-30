import type { FC } from "react";
import type { ImportSuppliesBody, ImportSuppliesResponse } from "../../api/models";
import type { Action } from "../../hooks/actions";
import type { CommunityWriteResult } from "../../hooks/actions/useCommunityActions";
import { CsvImportModal } from "./CsvImportModal";

interface ImportSuppliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  /**
   * The import itself, handed over by whoever may perform it.
   *
   * Required, not optional: the modal has no way to render without it, which is
   * what stops it being mounted for a caller the backend would refuse. The
   * action already carries the community it writes into, so this component
   * never chooses one.
   */
  importSupplies: Action<[ImportSuppliesBody], CommunityWriteResult<ImportSuppliesResponse>>;
}

export const ImportSuppliesModal: FC<ImportSuppliesModalProps> = ({ importSupplies, ...props }) => {
  return (
    <CsvImportModal
      {...props}
      title={(community) => `Importar puntos de suministro a ${community}`}
      expectedColumns="code, address, addressRef, personalId"
      uploadingLabel="Importando puntos de suministro..."
      createdNoun={{ one: "punto de suministro", other: "puntos de suministro" }}
      importFile={(file, _communityId, { onSuccess, onError }) => {
        void (async () => {
          const outcome = await importSupplies.run({ file });
          if (!("ok" in outcome)) {
            onError();
            return;
          }
          onSuccess({
            createdCount: outcome.value.created,
            errors: outcome.value.rows
              .filter((row) => row.outcome === "FAILED")
              .map((row) => ({ item: `Línea ${row.line}`, message: row.message ?? "" })),
          });
        })();
      }}
    />
  );
};
