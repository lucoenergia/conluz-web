import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useGetAllPlants } from "../../api/plants/plants";
import { SharingAgreementResponseStatus, type PlantResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { SharingAgreementStatusChip } from "../../components/SharingAgreementStatusChip";
import { useActiveCommunity } from "../../context/community.context";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { HomeCard } from "./HomeCard";
import { HomeViewSwitch } from "./HomeViewSwitch";
import { NeutralNotice } from "./NeutralNotice";
import { plantAgreementStatus, type PlantAgreementStatus } from "./management/plantAgreementStatus";
import { useMemberCount, useSupplyPointCount, type CommunityCount } from "./management/useCommunityCounts";
import { usePlantSharingAgreements } from "./management/usePlantSharingAgreements";

/**
 * The community admin's home (#198): how many members and supply points the
 * active community has, and where each of its plants stands with its sharing
 * agreements.
 *
 * Every read here is one the backend grants exactly when it grants the
 * community's canManage, which this view requires, so none carries a gate of
 * its own. Each read is independent: one failing leaves the rest of the view
 * in place.
 */
export const CommunityManagementPage: FC = () => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
    <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
      Gestión de la comunidad
    </Typography>
    <HomeViewSwitch current="management" />
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
      <MemberCountCard />
      <SupplyPointCountCard />
    </Box>
    <HomeCard title="Acuerdos de reparto">
      <PlantList />
    </HomeCard>
  </Box>
);

const MemberCountCard: FC = () => (
  <CountCard title="Miembros" what="el número de miembros" {...useMemberCount()} />
);

const SupplyPointCountCard: FC = () => (
  <CountCard title="Puntos de suministro" what="el número de puntos de suministro" {...useSupplyPointCount()} />
);

/** A count, or why there is none: loading or failed are never shown as 0. */
const CountCard: FC<CommunityCount & { title: string; what: string }> = ({ title, what, count, isError, retry }) => (
  <HomeCard title={title}>
    {isError ? (
      <LoadErrorAlert message={`No se pudo cargar ${what}.`} onRetry={retry} />
    ) : count === undefined ? (
      <Skeleton variant="rounded" width={96} height={48} aria-label={`Cargando ${what}`} />
    ) : (
      <Typography variant="h3" component="p" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {count}
      </Typography>
    )}
  </HomeCard>
);

const PlantList: FC = () => {
  const communityId = useActiveCommunity();
  // The same page size and key as the plants page, so the two share a cache entry.
  const { data, isError, refetch } = useGetAllPlants(
    communityId ?? "",
    { size: 10000 },
    { query: { enabled: !!communityId } },
  );

  if (isError) {
    return <LoadErrorAlert message="No se pudieron cargar las plantas de la comunidad." onRetry={() => void refetch()} />;
  }
  if (!data) return <Skeleton variant="rounded" height={96} aria-label="Cargando las plantas de la comunidad" />;

  const plants = data.items ?? [];
  if (plants.length === 0) {
    return (
      <NeutralNotice title="La comunidad todavía no tiene plantas">
        Cuando se dé de alta una planta, aquí verás el estado de su acuerdo de reparto.
      </NeutralNotice>
    );
  }
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      {plants.map((plant) => (
        <PlantAgreementRow key={plant.id} plant={plant} />
      ))}
    </Box>
  );
};

/** One plant and its agreement status. A component per plant, so each plant's read stands on its own. */
const PlantAgreementRow: FC<{ plant: PlantResponse }> = ({ plant }) => {
  const { agreements, isError, retry } = usePlantSharingAgreements(plant);

  return (
    <Box component="li" aria-label={plant.name} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="body1" component="h3" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {plant.name}
      </Typography>
      {isError ? (
        <LoadErrorAlert message={`No se pudo cargar el acuerdo de reparto de ${plant.name}.`} onRetry={retry} />
      ) : agreements === undefined ? (
        <Skeleton variant="rounded" height={40} aria-label={`Cargando el acuerdo de reparto de ${plant.name}`} />
      ) : (
        <AgreementStatus status={plantAgreementStatus(agreements)} />
      )}
    </Box>
  );
};

const NOT_IN_FORCE: Record<Exclude<PlantAgreementStatus["kind"], "in-force">, string> = {
  draft: "Su acuerdo de reparto está en preparación: hay un borrador sin publicar.",
  ended: "No tiene ningún acuerdo de reparto en vigor: los anteriores ya terminaron.",
  none: "Todavía no tiene acuerdo de reparto.",
};

const AgreementStatus: FC<{ status: PlantAgreementStatus }> = ({ status }) => {
  // Any state short of an agreement in force is an ordinary stage of a plant
  // being set up, so it is explained, never flagged.
  if (status.kind !== "in-force") return <NeutralNotice>{NOT_IN_FORCE[status.kind]}</NeutralNotice>;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
      <SharingAgreementStatusChip status={SharingAgreementResponseStatus.PUBLISHED} />
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {status.names.join(", ")}
      </Typography>
    </Box>
  );
};
