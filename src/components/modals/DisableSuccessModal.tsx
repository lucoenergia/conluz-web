import type { FC } from "react";
import { AlertModal } from "./AlertModal";

interface DisableSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  code: string;
}

export const DisableSuccessModal: FC<DisableSuccessModalProps> = ({ onClose, isOpen, code }) => {
  return (
    <AlertModal isOpen={isOpen} onClose={onClose}>
        El punto de suministro <br />
        <span className="font-bold">{code}</span> <br />
        ha sido deshabilitado
    </AlertModal>
  );
};
