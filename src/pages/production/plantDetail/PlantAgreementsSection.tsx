import type { FC } from "react";
import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { SharingAgreementResponseStatus, type PlantResponse, type SharingAgreementResponse } from "../../../api/models";
import { EmptyState } from "../../../components/EmptyState";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert/LoadErrorAlert";
import { SharingAgreementStatusChip } from "../../../components/SharingAgreementStatusChip";
import { colors, radii } from "../../../theme/tokens";
import { formatCalendarDate } from "../../../utils/formatCalendarDate";
import { usePlantSharingAgreements } from "../../home/management/usePlantSharingAgreements";
import { PlantSection } from "./PlantSection";
import { PLANT_SECTION_IDS } from "./plantSections";
import { AGREEMENTS_ICON } from "./sectionIcons";

/** In force first, then those being prepared. Superseded ones are history and stay on the full list. */
const LISTED_STATUSES = [SharingAgreementResponseStatus.PUBLISHED, SharingAgreementResponseStatus.DRAFT];

const AgreementLink: FC<{ plantId: string; agreement: SharingAgreementResponse }> = ({ plantId, agreement }) => (
  <Box component="li">
    <Link
      component={RouterLink}
      to={`/production/${plantId}/sharing-agreements/${agreement.id}`}
      underline="none"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minHeight: 48,
        p: 2,
        border: `1px solid ${colors.border.light}`,
        borderRadius: radii.large,
        color: colors.text.primary,
        "&:hover": { bgcolor: colors.background.surface },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{agreement.name}</Typography>
        <SharingAgreementStatusChip status={agreement.status} />
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Creado el {formatCalendarDate(agreement.createdAt)}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon aria-hidden fontSize="small" sx={{ color: colors.text.muted, flexShrink: 0 }} />
    </Link>
  </Box>
);

/**
 * The plant's agreements in force and in draft, each linking to its detail,
 * and the way to the full list. Mounted only for a caller who may list them
 * (UI-PLT-002): mounting it is what issues the read.
 */
export const PlantAgreementsSection: FC<{ plant: PlantResponse }> = ({ plant }) => {
  const { agreements, isError, retry } = usePlantSharingAgreements(plant);
  const listed = LISTED_STATUSES.flatMap((status) => (agreements ?? []).filter((a) => a.status === status));

  return (
    <PlantSection
      id={PLANT_SECTION_IDS.agreements}
      title="Acuerdos de reparto"
      description="Cómo se reparte la energía de esta planta entre los puntos de suministro."
      icon={AGREEMENTS_ICON}
    >
      {isError && <LoadErrorAlert message="No se pudieron cargar los acuerdos de reparto." onRetry={retry} />}
      {agreements && listed.length === 0 && (
        <EmptyState
          icon={AGREEMENTS_ICON}
          title="Ningún acuerdo en vigor"
          subtitle="Esta planta no tiene ningún acuerdo de reparto vigente ni en borrador."
        />
      )}
      {listed.length > 0 && (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {listed.map((agreement) => (
            <AgreementLink key={agreement.id} plantId={plant.id} agreement={agreement} />
          ))}
        </Box>
      )}
      <Link
        component={RouterLink}
        to={`/production/${plant.id}/sharing-agreements`}
        sx={{ mt: 2, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", minHeight: 44, fontWeight: 600 }}
      >
        Ver todos los acuerdos
      </Link>
    </PlantSection>
  );
};
