import type { FC } from "react";
import { Box, CardContent, Chip, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, alphas } from "../../theme/tokens";
import { AppCard } from "../AppCard";
import type { SharingAgreementResponse } from "../../api/models";
import {
  getSharingAgreementStatusColor,
  getSharingAgreementStatusLabel,
} from "../../pages/production/sharingAgreementStatus";

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

  return (
    <AppCard
      header={
        <>
          <Typography variant="h6">{agreement.name || "Sin nombre"}</Typography>
          <Chip
            label={getSharingAgreementStatusLabel(agreement.status)}
            color={getSharingAgreementStatusColor(agreement.status)}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </>
      }
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 2,
            mb: notesExcerpt || agreement.id ? 2 : 0,
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
              mb: agreement.id ? 2 : 0,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {notesExcerpt}
            </Typography>
          </Box>
        )}

        {agreement.id && (
          <Link
            component={RouterLink}
            to={`/production/${plantId}/sharing-agreements/${agreement.id}`}
            sx={{
              display: "inline-block",
              fontWeight: 600,
              color: "primary.main",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Ver detalle
          </Link>
        )}
      </CardContent>
    </AppCard>
  );
};
