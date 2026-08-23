import { useState, type FC } from "react";
import { Box, IconButton, MenuItem, Typography, Divider } from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import { DetailHeader, DetailTile } from "../DetailHeader";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { alphas, colors } from "../../theme/tokens";

export interface SharingAgreementDetailHeaderProps {
  agreement?: SharingAgreementResponse;
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
  onEdit?: () => void;
  onDeleteRequest?: () => void;
}

export const SharingAgreementDetailHeader: FC<SharingAgreementDetailHeaderProps> = ({
  agreement,
  plant,
  isLoading = false,
  error = null,
  onEdit,
  onDeleteRequest,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isDraft = agreement?.status === SharingAgreementResponseStatus.DRAFT;
  const showActions = !isLoading && !error && isDraft;

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
              sx={{
                color: "white",
                minWidth: 40,
                minHeight: 40,
                "&:hover": { backgroundColor: alphas.white.hairline },
              }}
            >
              <MoreVertIcon />
            </IconButton>
            <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
              <Box sx={{ py: 1 }}>
                <MenuItem onClick={handleEditClick}>
                  <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                    Editar
                  </Typography>
                </MenuItem>
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
        {agreement?.installedPowerKw !== undefined ? `${agreement.installedPowerKw} kW` : "-"}
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
