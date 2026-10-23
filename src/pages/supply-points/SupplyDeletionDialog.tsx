import type { FC } from "react";
import type { SupplyResponse } from "../../api/models";
import { DeleteSupplyConfirmationModal } from "../../components/Modals/DeleteSupplyConfirmationModal";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { supplyDeletionRefusal, supplyDeletionRefusalMessage } from "../../errors/supplyErrors";
import { useSupplyActions } from "../../hooks/actions";

interface SupplyDeletionDialogProps {
  /**
   * The supply to delete, resolved by the screen from its own read on every
   * render. Undefined closes the dialog -- which is also what happens once a
   * deleted supply leaves the list.
   */
  supply: SupplyResponse | undefined;
  onClose: () => void;
  /** Called once the supply is gone: deleted now, or already (a 404). */
  onGone?: () => void;
}

/**
 * The confirmation of "Eliminar punto de suministro" and what follows it
 * (#290), shared by the supply list and the detail page. Mounted only while the
 * supply grants the deletion, so it cannot stay open across a refresh that
 * revokes it.
 */
export const SupplyDeletionDialog: FC<SupplyDeletionDialogProps> = ({ supply, onClose, onGone }) => {
  const { remove } = useSupplyActions().forSupply(supply).actions;
  const successDispatch = useSuccessDispatch();
  const errorDispatch = useErrorDispatch();

  if (!supply || !remove) return null;

  const handleConfirm = async () => {
    const { code } = supply;
    const result = await remove.run();
    onClose();
    if ("ok" in result) {
      successDispatch(`Punto de suministro ${code} eliminado.`);
      onGone?.();
      return;
    }
    errorDispatch(supplyDeletionRefusalMessage(result.error));
    if (supplyDeletionRefusal(result.error) === "not-found") onGone?.();
  };

  return (
    <DeleteSupplyConfirmationModal
      isOpen
      code={supply.code}
      name={supply.name}
      ownerName={supply.ownerRecord?.fullName ?? null}
      isDeleting={remove.isPending}
      onCancel={onClose}
      onConfirm={() => void handleConfirm()}
    />
  );
};
