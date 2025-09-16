import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

interface EnableConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onEnable: () => void;
}

export const EnableConfirmationModal: FC<EnableConfirmationModalProps> = ({
  isOpen,
  code,
  onCancel,
  onEnable,
}) => {


  return (
    <ConfirmationModal isOpen={isOpen} onCancel={onCancel} confirmLabel="Rehabilitar" confirmColor="success" onConfirm={onEnable}>
      <Typography id="modal-modal-title" variant="h6" component="h2">
        Rehabilitar punto de suministro
      </Typography>
      <Typography className="font-bold">{code}</Typography>
      <Typography id="modal-modal-description" sx={{ mt: 2, pl: 2, pr: 2, textAlign: "justify" }}>
        Al rehabilitar este punto de suministro sus datos se mostrarán en la plataforma y se contabilizarán para
        los cálculos.
      </Typography>
    </ConfirmationModal>
  );
};
