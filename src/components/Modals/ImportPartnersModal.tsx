import type { FC } from "react";
import type { CreateUsersInBulkResponse, CreateUsersWithFileBody } from "../../api/models";
import type { Action } from "../../hooks/actions";
import { CsvImportModal } from "./CsvImportModal";

interface ImportPartnersModalProps {
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
   *
   * Note which capability that is: POST /api/v1/users/import creates users, so
   * it is gated on the community's canCreateUsers, not on canManageMemberships.
   */
  importUsers: Action<[CreateUsersWithFileBody], CreateUsersInBulkResponse | undefined>;
}

export const ImportPartnersModal: FC<ImportPartnersModalProps> = ({ importUsers, ...props }) => {
  return (
    <CsvImportModal
      {...props}
      title="Importar miembros desde CSV"
      expectedColumns="number, fullName, personalId, address, email, phoneNumber, role, password"
      uploadingLabel="Importando miembros..."
      createdNoun={{ one: "miembro", other: "miembros" }}
      importFile={(file, _communityId, { onSuccess, onError }) => {
        void (async () => {
          const result = await importUsers.run({ file });
          // The action swallows the throw and reports the failure as no value,
          // so there is one path here rather than a catch as well.
          if (!result) {
            onError();
            return;
          }
          onSuccess({
            createdCount: result.created?.length || 0,
            errors: (result.errors || []).map((err) => ({
              item: err.personalId || null,
              message: err.errorMessage,
            })),
          });
        })();
      }}
    />
  );
};
