import type { FC } from "react";
import { useCreateUsersWithFile } from "../../api/users/users";
import { CsvImportModal } from "./CsvImportModal";

interface ImportPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

export const ImportPartnersModal: FC<ImportPartnersModalProps> = (props) => {
  const mutation = useCreateUsersWithFile();

  return (
    <CsvImportModal
      {...props}
      title={(community) => `Importar miembros a ${community}`}
      expectedColumns="number, fullName, personalId, address, email, phoneNumber, role, password"
      uploadingLabel="Importando miembros..."
      createdNoun={{ one: "miembro", other: "miembros" }}
      importFile={(file, communityId, { onSuccess, onError }) =>
        mutation.mutate(
          { data: { file }, params: { communityId } },
          {
            onSuccess: (data) =>
              onSuccess({
                createdCount: data.created?.length || 0,
                errors: (data.errors || []).map((err) => ({
                  item: err.personalId || null,
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
