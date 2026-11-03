import type { FC } from "react";
import type { PlantResponse } from "../../api/models";
import { DeleteConfirmationModal } from "../../components/Modals/DeleteConfirmationModal";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { plantDeletionRefusalMessage } from "../../errors/plantErrors";
import { usePlantActions } from "../../hooks/actions";

interface PlantDeletionDialogProps {
  /**
   * The plant to delete, resolved by the page from its own read on every
   * render. Undefined closes the dialog.
   */
  plant: PlantResponse | undefined;
  onClose: () => void;
}

/**
 * The confirmation of a plant deletion from the plant list, and what follows
 * it. The page keeps it mounted, so the deletion it starts and the message
 * that reports it outlive the row, which leaves the list once it refreshes
 * (UI-PLT-009).
 *
 * The dialog closes before the request is sent, so it holds no request in
 * flight.
 */
export const PlantDeletionDialog: FC<PlantDeletionDialogProps> = ({ plant, onClose }) => {
  const { remove } = usePlantActions().forPlant(plant).actions;
  const successDispatch = useSuccessDispatch();
  const errorDispatch = useErrorDispatch();

  if (!plant || !remove) return null;

  const handleConfirm = async () => {
    const { providerCode } = plant;
    onClose();
    const result = await remove.run();
    if ("ok" in result) successDispatch(`Planta ${providerCode} eliminada.`);
    else errorDispatch(plantDeletionRefusalMessage(result.error));
  };

  return (
    <DeleteConfirmationModal
      isOpen
      code={plant.providerCode}
      onCancel={onClose}
      onDelete={() => void handleConfirm()}
    />
  );
};
