import type { FC } from "react";
import { useCreateSuppliesWithFile } from "../../api/supplies/supplies";
import { CsvImportModal } from "./CsvImportModal";

interface ImportSuppliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ImportSuppliesModal: FC<ImportSuppliesModalProps> = (props) => {
  const mutation = useCreateSuppliesWithFile();

  return (
    <CsvImportModal
      {...props}
      title="Importar Puntos de Suministro desde CSV"
      expectedColumns="code, address, addressRef, personalId"
      uploadingLabel="Importando puntos de suministro..."
      createdNoun={{ one: "punto de suministro", other: "puntos de suministro" }}
      importFile={(file, communityId, { onSuccess, onError }) =>
        mutation.mutate(
          { data: { file }, params: { communityId } },
          {
            onSuccess: (data) =>
              onSuccess({
                createdCount: data.created?.length || 0,
                errors: (data.errors || []).map((err) => ({
                  item: err.item != null ? String(err.item) : null,
                  message: err.errorMessage,
                })),
              }),
            onError,
          },
        )
      }
    />
  );
};
