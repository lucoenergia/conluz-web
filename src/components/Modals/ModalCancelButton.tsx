import type { FC, ReactNode } from "react";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import { fontSizes } from "../../theme/tokens";
import { useResponsiveOverlay } from "../ResponsiveOverlay";

interface ModalCancelButtonProps {
  disabled?: boolean;
  /** "Cancelar" by default. */
  children?: ReactNode;
}

/**
 * The outlined "Cancelar" of an `AppModal` footer. It closes through the
 * overlay's close path, so it asks first when the dialog has unsaved changes
 * (UI-OVL-003) and calls the modal's `onClose` otherwise.
 */
export const ModalCancelButton: FC<ModalCancelButtonProps> = ({ disabled = false, children = "Cancelar" }) => {
  const { requestClose } = useResponsiveOverlay();
  return (
    <Button
      variant="outlined"
      onClick={requestClose}
      disabled={disabled}
      sx={{
        minWidth: "64px",
        padding: "5px 15px",
        fontSize: fontSizes.lg,
        borderColor: (theme) => theme.palette.primary.main,
        color: (theme) => theme.palette.primary.main,
        "&:hover": {
          borderColor: (theme) => theme.palette.primary.dark,
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      {children}
    </Button>
  );
};
