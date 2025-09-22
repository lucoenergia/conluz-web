import Typography from "@mui/material/Typography";
import type { FC, MouseEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";

interface DisableConfirmationModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDisable: () => void;
}

export const DisableConfirmationModal: FC<DisableConfirmationModalProps> = ({ isOpen, code, onCancel, onDisable }) => {
  return (
    <ConfirmationModal isOpen={isOpen} onCancel={onCancel} confirmLabel="Deshabilitar" onConfirm={onDisable}>
      <Typography id="modal-modal-title" variant="h6" component="h2">
        Deshabilitar punto de suministro
      </Typography>
      <Typography className="font-bold">{code}</Typography>
      <Typography id="modal-modal-description" sx={{ mt: 2, pl: 2, pr: 2, textAlign: "justify" }}>
        Al deshabilitar este punto de suministro sus datos no se mostrarán en la plataforma ni se contabilizarán para
        los cálculos. Los datos producidos por este punto de suministro no se eliminarán.
      </Typography>
    </ConfirmationModal>
  );
};
