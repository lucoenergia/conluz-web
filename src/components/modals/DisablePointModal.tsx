import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { BasicModal } from "./BasicModal";
import type { FC, MouseEvent } from "react";

interface DisablePointModalProps {
  isOpen: boolean;
  code: string;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onDisable: () => void;
}

export const DisablePointModal: FC<DisablePointModalProps> = ({
  isOpen,
  code,
  onCancel,
  onDisable,
}) => {

  const handleDisable = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onDisable();
  };

  return (
    <BasicModal isOpen={isOpen} onClose={onCancel}>
      <Typography id="modal-modal-title" variant="h6" component="h2">
        Deshabilitar punto de suministro
      </Typography>
      <Typography className="font-bold">{code}</Typography>
      <Typography id="modal-modal-description" sx={{ mt: 2, pl: 2, pr: 2, textAlign: "justify" }}>
        Al deshabilitar este punto de suministro sus datos no se mostrarán en la plataforma ni se contabilizarán para
        los cálculos. Los datos producidos por este punto de suministro no se eliminarán.
      </Typography>
      <Box className="flex justify-around pt-8 gap-5">
        <Button
          variant="contained"
          color="error"
          onClick={handleDisable}
          className="flex items-center justify-center text-center leading-none"
        >
          Deshabilitar
        </Button>
        <Button variant="contained" color="primary" onClick={onCancel}>
          Cancelar
        </Button>
      </Box>
    </BasicModal>
  );
};
