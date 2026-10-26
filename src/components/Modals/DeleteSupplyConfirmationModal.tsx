import Typography from "@mui/material/Typography";
import type { FC, SyntheticEvent } from "react";
import { ConfirmationModal } from "./ConfirmationModal";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { radii, alphas, fontSizes } from "../../theme/tokens";
import { CommunityScopeHeader } from "../CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";

interface DeleteSupplyConfirmationModalProps {
  isOpen: boolean;
  /** The supply's CUPS. */
  code: string;
  /** The supply's own name, when it has one. */
  name?: string | null;
  /** The owner's full name; null for a supply with no owner. */
  ownerName?: string | null;
  isDeleting?: boolean;
  onCancel: (event: SyntheticEvent) => void;
  onConfirm: () => void;
}

/**
 * Confirms deleting a supply (#290). It names the supply and its owner, the
 * person an admin is usually acting for (UI-MBR-015), and says the deletion
 * cannot be undone.
 */
export const DeleteSupplyConfirmationModal: FC<DeleteSupplyConfirmationModalProps> = ({
  isOpen,
  code,
  name,
  ownerName,
  isDeleting = false,
  onCancel,
  onConfirm,
}) => {
  const communityName = useActiveCommunityName();
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onCancel={onCancel}
      inFlight={isDeleting}
      confirmLabel="Eliminar"
      confirmDisabled={isDeleting}
      confirmPending={isDeleting}
      onConfirm={onConfirm}
      title={`Eliminar punto de suministro de ${communityLabel(communityName)}`}
      scopeHeader={<CommunityScopeHeader name={communityName} />}
      icon={<WarningAmberIcon sx={{ fontSize: 28, color: "error.main" }} />}
      iconBg={alphas.error.light}
    >
      <Typography
        sx={{
          fontSize: fontSizes.md,
          fontWeight: 600,
          color: "secondary.main",
          mb: 2,
          backgroundColor: alphas.error.subtle,
          padding: "8px 12px",
          borderRadius: radii.default,
        }}
      >
        {code}
      </Typography>
      {name && (
        <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6 }}>
          Nombre: <strong>{name}</strong>
        </Typography>
      )}
      <Typography sx={{ fontSize: fontSizes.lg, color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
        {ownerName ? (
          <>
            Titular: <strong>{ownerName}</strong>
          </>
        ) : (
          "Sin titular"
        )}
      </Typography>
      <Typography
        sx={{
          fontSize: fontSizes.lg,
          color: "text.secondary",
          lineHeight: 1.6,
        }}
      >
        Se eliminarán también su contrato, sus datos de distribuidora y su dispositivo Shelly. Esta acción no se puede
        deshacer.
      </Typography>
    </ConfirmationModal>
  );
};
