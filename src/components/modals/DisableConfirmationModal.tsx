import type { FC } from "react";
import { BasicModal } from "./BasicModal";
import { Button, Typography } from "@mui/material";

interface DisableConfirmationModalProps {
    onClose: () => void,
    isOpen: boolean,
    code: string
}

export const DisableConfirmationModal: FC<DisableConfirmationModalProps> = ({onClose, isOpen, code}) => {

// Aquí debería esperar una respuesta de que ha sido efectivamente deshabilitado

return <BasicModal isOpen={isOpen} onClose={onClose} >
    <Typography className="flex flex-col items-center text-center">
        El punto de suministro <br/>
        <span className="font-bold">{code}</span> <br/>
         ha sido deshabilitado
    </Typography>
    <Button variant="text" color="primary" onClick={onClose}>Cerrar</Button>
</BasicModal>
}