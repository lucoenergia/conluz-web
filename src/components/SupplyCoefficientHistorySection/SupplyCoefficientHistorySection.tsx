import type { FC } from "react";
import { Box, Paper } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { SectionHeading } from "../SectionHeading";
import { CoefficientHistory } from "../CoefficientHistory";
import { useActiveCommunity } from "../../context/community.context";
import { useActiveCommunityRole } from "../../hooks/useActiveCommunityRole";
import { CommunityRole } from "../../api/models";
import { useGetPartitionCoefficientHistory } from "../../api/supplies/supplies";
import { selectPeriodsInCommunity } from "../../pages/production/coefficientHistory";

export interface SupplyCoefficientHistorySectionProps {
  supplyId: string;
}

/**
 * The supply's coefficient timeline across every plant it takes part in.
 *
 * Unlike the drawer this asks for no plantId, so a supply participating in
 * several plants renders one group per plant.
 *
 * Reachable by the supply owner, not only by an admin: the route carries no
 * community guard and the endpoint authorises the owner, withholding pending
 * periods from anyone who is not an admin of the supply's community.
 */
export const SupplyCoefficientHistorySection: FC<SupplyCoefficientHistorySectionProps> = ({ supplyId }) => {
  const activeCommunityId = useActiveCommunity();
  const role = useActiveCommunityRole();

  const { data, isLoading, error } = useGetPartitionCoefficientHistory(
    supplyId,
    undefined,
    { query: { enabled: !!supplyId } },
  );

  // Scoped to the selected community, not merely gated. GET /supplies/{id}
  // authorises the supply's own community admin OR its owner, independent of
  // which community is active here, and this route has no community guard --
  // so a supply from another community opens fine from a bookmark or a reload
  // after switching. Its agreements and coefficients must not be displayed.
  const periods = selectPeriodsInCommunity(data, activeCommunityId);

  /**
   * Links point at /production/{plantId}/sharing-agreements/{id}, which is
   * behind CommunityAdminRoute -- so this mirrors that guard exactly rather
   * than adding isPlatformAdmin, which the guard ignores. Safe as a single
   * boolean only because the periods above are already community-scoped.
   */
  const showAgreementLinks = role === CommunityRole.COMMUNITY_ADMIN;

  return (
    <Box sx={sxStyles.pageContainer}>
      <Paper elevation={0} sx={sxStyles.softPanel}>
        <SectionHeading
          title="Histórico de coeficientes"
          description="Qué parte de la producción se ha asignado a este punto de suministro y desde cuándo, en cada planta en la que participa."
        />
        <CoefficientHistory
          periods={periods}
          // No community selected yet is still loading, not empty: the filter
          // returns undefined there, and rendering "sin periodos" would state
          // an absence that has not been established.
          isLoading={isLoading || (!!supplyId && periods === undefined && !error)}
          error={error}
          showAgreementLinks={showAgreementLinks}
          emptySubtitle="Este punto de suministro todavía no tiene ningún coeficiente aplicado."
        />
      </Paper>
    </Box>
  );
};
