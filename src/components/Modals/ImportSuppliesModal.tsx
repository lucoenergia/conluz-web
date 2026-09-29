import type { FC } from "react";
import type { CreateSuppliesWithFileBody, CreationInBulkResponse } from "../../api/models";
import type { Action } from "../../hooks/actions";
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
  importSupplies: Action<[CreateSuppliesWithFileBody], CreationInBulkResponse | undefined>;
}

export const ImportSuppliesModal: FC<ImportSuppliesModalProps> = ({ importSupplies, ...props }) => {
  return (
    <CsvImportModal
      {...props}
      title="Importar Puntos de Suministro desde CSV"
      expectedColumns="code, address, addressRef, personalId"
      uploadingLabel="Importando puntos de suministro..."
      createdNoun={{ one: "punto de suministro", other: "puntos de suministro" }}
      importFile={(file, _communityId, { onSuccess, onError }) => {
        void (async () => {
          const result = await importSupplies.run({ file });
          // The action swallows the throw and reports the failure as no value,
          // so there is one path here rather than a catch as well.
          if (!result) {
            onError();
            return;
          }
          onSuccess({
            createdCount: result.created?.length || 0,
            errors: (result.errors || []).map((err) => ({
              item: err.item != null ? String(err.item) : null,
              message: err.errorMessage,
            })),
          });
        })();
      }}
    />
  );
};
