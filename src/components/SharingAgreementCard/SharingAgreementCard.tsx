import { useState, type FC } from "react";
import { Box, CardContent, IconButton, MenuItem, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, alphas, colors } from "../../theme/tokens";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { AppCard } from "../AppCard";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

export interface SharingAgreementCardProps {
  plantId: string;
  agreement: SharingAgreementResponse;
  onDeleteRequest?: (agreement: SharingAgreementResponse) => void;
}

const NOTES_EXCERPT_LENGTH = 140;

function formatCreatedAt(dateString?: string): string {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function excerpt(text: string | undefined, maxLength: number): string | undefined {
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

export const SharingAgreementCard: FC<SharingAgreementCardProps> = ({ plantId, agreement, onDeleteRequest }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const notesExcerpt = excerpt(agreement.notes ?? undefined, NOTES_EXCERPT_LENGTH);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isDraft = agreement.status === SharingAgreementResponseStatus.DRAFT;
  const detailPath = agreement.id ? `/production/${plantId}/sharing-agreements/${agreement.id}` : undefined;

  const handleCardClick = () => {
    if (!detailPath) return;
    if (window.getSelection()?.toString()) return;
    navigate(detailPath);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorElement(event.currentTarget);
  };

  const handleCloseMenu = (event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setAnchorElement(null);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleCloseMenu();
    onDeleteRequest?.(agreement);
  };

  return (
    <AppCard
      onClick={detailPath ? handleCardClick : undefined}
      sx={
        detailPath
          ? {
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-4px)",
              },
            }
          : undefined
      }
      header={
        <>
          {detailPath ? (
            <Typography
              variant="h6"
              component={RouterLink}
              to={detailPath}
              onClick={(event) => event.stopPropagation()}
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              {agreement.name || "Sin nombre"}
            </Typography>
          ) : (
            <Typography variant="h6">{agreement.name || "Sin nombre"}</Typography>
          )}
          {detailPath && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <ChevronRightIcon aria-hidden sx={{ color: "white", opacity: 0.7 }} />
              {isDraft && (
                <>
                  <IconButton
                    onClick={handleOpenMenu}
                    sx={{
                      color: "white",
                      minWidth: 40,
                      minHeight: 40,
                      "&:hover": {
                        backgroundColor: alphas.white.hairline,
                      },
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                  <MenuTemplate anchorElement={anchorElement} onClose={handleCloseMenu}>
                    <Box sx={{ py: 1 }}>
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
                </>
              )}
            </Box>
          )}
        </>
      }
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <SharingAgreementStatusChip status={agreement.status} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 2,
            mb: notesExcerpt ? 2 : 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              borderRadius: radii.default,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            }}
          >
            <CalendarTodayIcon sx={{ color: "primary.main", fontSize: 24 }} />
            <Box>
              <Typography variant="body1" fontWeight="600">
                {formatCreatedAt(agreement.createdAt)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fecha de creación
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              borderRadius: radii.default,
              bgcolor: alphas.success.subtle,
            }}
          >
            <BoltIcon sx={{ color: "success.main", fontSize: 24 }} />
            <Box>
              <Typography variant="body1" fontWeight="600">
                {agreement.installedPowerKw !== undefined ? formatKilowatts(agreement.installedPowerKw) : "-"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Potencia instalada
              </Typography>
            </Box>
          </Box>
        </Box>

        {notesExcerpt && (
          <Box
            sx={{
              p: 2,
              bgcolor: alphas.black.ghost,
              borderRadius: radii.default,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {notesExcerpt}
            </Typography>
          </Box>
        )}
      </CardContent>
    </AppCard>
  );
};
