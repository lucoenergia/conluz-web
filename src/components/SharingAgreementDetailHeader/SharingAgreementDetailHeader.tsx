import { useState, type FC } from "react";
import { Box, IconButton, MenuItem, Typography, Divider } from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import { DetailHeader, DetailTile } from "../DetailHeader";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { alphas, colors } from "../../theme/tokens";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  isFullSum,
  type CoefficientSummable,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { formatCoefficientGapMessage } from "../../pages/production/sharingAgreementGapMessage";

export interface SharingAgreementDetailHeaderProps {
  agreement?: SharingAgreementResponse;
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
  /**
   * The raw, non-defaulted partition-coefficients query result: `undefined` while still in
   * flight, as opposed to a resolved `[]` — mirrors `selectSharingAgreementNextStep`'s own
   * distinction. Conflating the two would let a PUBLISHED agreement with applied coefficients
   * briefly show "Volver a borrador" (since `[].every(...)` is vacuously true), and would render
   * "sin coeficientes" for a DRAFT that actually has them, for a fraction of a second on every load.
   */
  coefficients?: CoefficientSummable[];
  onEdit?: () => void;
  onDeleteRequest?: () => void;
  onPublishRequest?: () => void;
  onRevertRequest?: () => void;
}

export const SharingAgreementDetailHeader: FC<SharingAgreementDetailHeaderProps> = ({
  agreement,
  plant,
  isLoading = false,
  error = null,
  coefficients,
  onEdit,
  onDeleteRequest,
  onPublishRequest,
  onRevertRequest,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;
  const isPublished = agreement?.status === SharingAgreementResponseStatus.PUBLISHED;

  const publishDisabledReason = (() => {
    if (coefficients === undefined) return undefined;
    if (coefficients.length === 0) return "Este acuerdo todavía no tiene coeficientes.";
    const { fileSumUnits } = computeSharingAgreementCoefficientSums(coefficients);
    if (isFullSum(fileSumUnits)) return undefined;
    return formatCoefficientGapMessage(COEFFICIENT_SCALE - fileSumUnits) ?? undefined;
  })();

  const isInert =
    coefficients !== undefined &&
    coefficients.every(
      (coefficient) =>
        coefficient.applicationState !== SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
    );

  const showPublish = isDraft && coefficients !== undefined;
  const showRevert = isPublished && coefficients !== undefined && isInert;
  const showActions = !isLoading && !error && (isDraft || showRevert);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorElement(null);
  };

  const handleEditClick = () => {
    handleCloseMenu();
    onEdit?.();
  };

  const handleDeleteClick = () => {
    handleCloseMenu();
    onDeleteRequest?.();
  };

  const handlePublishClick = () => {
    if (publishDisabledReason) return;
    handleCloseMenu();
    onPublishRequest?.();
  };

  const handleRevertClick = () => {
    handleCloseMenu();
    onRevertRequest?.();
  };

  return (
  <DetailHeader
    icon={<HandshakeOutlinedIcon sx={{ fontSize: 32 }} />}
    title={
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 1 }}>
          <Typography variant="h4">{agreement?.name || "Acuerdo de reparto"}</Typography>
          {!isLoading && !error && <SharingAgreementStatusChip status={agreement?.status} tone="onDark" />}
        </Box>
        {showActions && (
          <Box sx={{ flexShrink: 0 }}>
            <IconButton
              onClick={handleOpenMenu}
              aria-label="Más opciones del acuerdo"
              sx={{
                color: "white",
                minWidth: 40,
                minHeight: 40,
                "&:hover": { backgroundColor: alphas.white.hairline },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <MenuTemplate
              anchorElement={anchorElement}
              onClose={handleCloseMenu}
              menuListProps={{ disabledItemsFocusable: true }}
            >
              <Box sx={{ py: 1 }}>
                {isDraft && (
                  <MenuItem onClick={handleEditClick}>
                    <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                      Editar
                    </Typography>
                  </MenuItem>
                )}
                {showPublish && (
                  <MenuItem
                    aria-disabled={!!publishDisabledReason}
                    aria-describedby={publishDisabledReason ? "publish-disabled-reason" : undefined}
                    disableRipple={!!publishDisabledReason}
                    onClick={handlePublishClick}
                    sx={{
                      display: "block",
                      cursor: publishDisabledReason ? "default" : "pointer",
                      ...(publishDisabledReason && { "&:hover": { backgroundColor: "transparent" } }),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PublishOutlinedIcon
                        sx={{
                          mr: 2,
                          fontSize: 20,
                          flexShrink: 0,
                          color: publishDisabledReason ? colors.text.muted : colors.text.subtle,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: publishDisabledReason ? colors.text.muted : colors.text.body,
                          fontWeight: 500,
                          textAlign: "left",
                        }}
                      >
                        Poner en vigor
                      </Typography>
                    </Box>
                    {publishDisabledReason && (
                      <Typography
                        id="publish-disabled-reason"
                        variant="caption"
                        sx={{ display: "block", mt: 0.5, ml: 4.5, color: colors.text.subtle }}
                      >
                        {publishDisabledReason}
                      </Typography>
                    )}
                  </MenuItem>
                )}
                {showRevert && (
                  <MenuItem onClick={handleRevertClick}>
                    <UndoOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                      Volver a borrador
                    </Typography>
                  </MenuItem>
                )}
                {isDraft && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <MenuItem
                      onClick={handleDeleteClick}
                      sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
                    >
                      <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.dark", flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: "error.dark", fontWeight: 500, textAlign: "left" }}>
                        Eliminar
                      </Typography>
                    </MenuItem>
                  </>
                )}
              </Box>
            </MenuTemplate>
          </Box>
        )}
      </Box>
    }
    subtitle={plant?.regulatoryCode ? `CAU: ${plant.regulatoryCode}` : "CAU no disponible"}
    isLoading={isLoading}
    error={error}
  >
    <DetailTile label="Fecha de creación">
      <Typography variant="body1" fontWeight="bold">
        {formatCalendarDate(agreement?.createdAt)}
      </Typography>
    </DetailTile>

    <DetailTile label="Potencia instalada">
      <Typography variant="body1" fontWeight="bold">
        {agreement?.installedPowerKw !== undefined ? formatKilowatts(agreement.installedPowerKw) : "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Notas" sx={{ gridColumn: { xs: "1", sm: "span 2", md: "span 2" } }}>
      <Typography variant="body2" fontWeight="500" sx={{ opacity: 0.95 }}>
        {agreement?.notes || "-"}
      </Typography>
    </DetailTile>
  </DetailHeader>
  );
};
