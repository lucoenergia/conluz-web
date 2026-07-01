import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import { AppModal } from "./AppModal";
import { shadows, fontSizes } from "../../theme/tokens";
import type { FC, MouseEvent, ReactNode } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onCancel: (event: MouseEvent<HTMLElement>) => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  confirmDisabled?: boolean;
  title?: string;
  icon?: ReactNode;
  iconBg?: string;
  children: ReactNode;
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmColor = "error",
  confirmDisabled = false,
  title,
  icon,
  iconBg,
  children,
}) => {
  const handleConfirm = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onConfirm();
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      icon={icon}
      iconBg={iconBg}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              borderColor: (theme) => theme.palette.primary.main,
              color: (theme) => theme.palette.primary.main,
              "&:hover": {
                borderColor: (theme) => theme.palette.primary.dark,
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={confirmColor}
            onClick={handleConfirm}
            disabled={confirmDisabled}
            sx={{
              minWidth: "64px",
              padding: "5px 15px",
              fontSize: fontSizes.lg,
              transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: shadows.medium,
              "&:hover": {
                boxShadow: shadows.strong,
              },
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </AppModal>
  );
};
