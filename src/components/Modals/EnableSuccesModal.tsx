import type { FC } from "react";
import { AlertModal } from "./AlertModal";

interface EnableSuccessModalProps {
  onClose: (event: React.MouseEvent<HTMLElement>) => void;
  isOpen: boolean;
  code: string;
}

export const EnableSuccessModal: FC<EnableSuccessModalProps> = ({ onClose, isOpen, code }) => {
  return (
    <AlertModal isOpen={isOpen} onClose={onClose}>
      El punto de suministro <br />
      <span className="font-bold">{code}</span> <br />
      ha sido rehabilitado
    </AlertModal>
  );
};
