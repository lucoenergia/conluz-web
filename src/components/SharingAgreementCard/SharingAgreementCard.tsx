import { useState, type FC } from "react";
import { Box, CardContent, IconButton, MenuItem, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, alphas, colors } from "../../theme/tokens";
import { AppCard } from "../AppCard";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import type { SharingAgreementResponse } from "../../api/models";

export interface SharingAgreementCardProps {
  plantId: string;
  agreement: SharingAgreementResponse;
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

export const SharingAgreementCard: FC<SharingAgreementCardProps> = ({ plantId, agreement }) => {
  const theme = useTheme();
  const notesExcerpt = excerpt(agreement.notes, NOTES_EXCERPT_LENGTH);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

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

  return (
    <AppCard
      header={
        <>
          <Typography variant="h6">{agreement.name || "Sin nombre"}</Typography>
          {agreement.id && (
            <Box sx={{ flexShrink: 0 }}>
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
                  <Box
                    component={RouterLink}
                    to={`/production/${plantId}/sharing-agreements/${agreement.id}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    <MenuItem>
                      <VisibilityOutlinedIcon sx={{ mr: 2, fontSize: 20, color: colors.text.subtle, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: colors.text.body, fontWeight: 500, textAlign: "left" }}>
                        Ver detalle
                      </Typography>
                    </MenuItem>
                  </Box>
                </Box>
              </MenuTemplate>
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
                {agreement.installedPowerKw !== undefined ? `${agreement.installedPowerKw} kW` : "-"}
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
