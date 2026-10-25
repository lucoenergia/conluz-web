import Typography from "@mui/material/Typography";
import type { FC, SyntheticEvent } from "react";
import { fontSizes } from "../../theme/tokens";
import { ConfirmationModal } from "./ConfirmationModal";
import { Notice } from "../Notice";

interface DeleteContactChannelConfirmationModalProps {
  isOpen: boolean;
  /** The channel's name, as members see it. */
  label: string;
  /** How many channels stay after the deletion. At 0, the community is left without contact. */
  otherCount: number;
  onCancel: (event: SyntheticEvent) => void;
  onConfirm: () => void;
}

/**
 * Confirms deleting a contact channel (#296). Deleting the only one leaves the
 * community without contact, so the dialog says so instead of the usual
 * reassurance about the others.
 */
export const DeleteContactChannelConfirmationModal: FC<DeleteContactChannelConfirmationModalProps> = ({
  isOpen,
  label,
  otherCount,
  onCancel,
  onConfirm,
}) => (
  <ConfirmationModal
    isOpen={isOpen}
    onCancel={onCancel}
    onConfirm={onConfirm}
    confirmLabel="Eliminar canal"
    title={`¿Eliminar el canal «${label}»?`}
  >
    {otherCount === 0 ? (
      <Notice severity="info">
        Es el único canal. Si lo eliminas, tu comunidad se quedará sin contacto y los miembros no sabrán cómo contactar
        con quien la gestiona hasta que añadas otro.
      </Notice>
    ) : (
      <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6 }}>
        Los miembros dejarán de verlo en Contacto.{" "}
        {otherCount === 1 ? "El otro canal no cambia." : `Los otros ${otherCount} canales no cambian.`}
      </Typography>
    )}
  </ConfirmationModal>
);
