import type { FC } from "react";
import { Alert, Box, CircularProgress, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import HistoryIcon from "@mui/icons-material/History";
import { colors, fontSizes, radii } from "../../theme/tokens";
import { EmptyState } from "../EmptyState";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { formatCoefficientPercentage } from "../../pages/production/sharingAgreementCoefficientSums";
import {
  formatCoefficientPeriodRange,
  groupCoefficientHistoryByPlant,
  isActivePeriod,
  selectAppliedPeriods,
} from "../../pages/production/coefficientHistory";
import type { PartitionCoefficientResponse, SharingAgreementResponseStatus } from "../../api/models";

export interface CoefficientHistoryProps {
  /** Raw periods as returned by the history endpoint. Pending ones are filtered here. */
  periods: PartitionCoefficientResponse[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  /**
   * Whether agreement names become links. A plain boolean is safe only because
   * callers never pass periods from outside the selected community -- the
   * agreement route is CommunityAdminRoute-guarded, so a link to another
   * community's agreement would redirect or 404.
   */
  showAgreementLinks?: boolean;
  /**
   * The agreement already on screen. Its period is marked and deliberately not
   * linked: navigating to the page you are already on is a dead action.
   */
  currentSharingAgreementId?: string;
  /** Overrides the empty-state subtitle, which differs between the drawer and the detail page. */
  emptySubtitle?: string;
}

const RAIL_WIDTH = 28;
const RING_SIZE = 20;
const DOT_SIZE = 10;
/** Aligns the dot with the cap height of the agreement name beside it. */
const RAIL_TOP_OFFSET = "2px";

const PeriodDot: FC<{ active: boolean }> = ({ active }) => (
  <Box
    data-testid="coefficient-history-dot"
    sx={{
      width: RING_SIZE,
      height: RING_SIZE,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      // Being in force is an ordinary state, not a fault, so it reads in the
      // success tone the rest of the app already uses for APPLIED -- never
      // error or warning.
      bgcolor: active ? colors.success.surface : "transparent",
    }}
  >
    <Box
      sx={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: "50%",
        bgcolor: active ? colors.success.main : colors.text.placeholder,
      }}
    />
  </Box>
);

const Period: FC<{
  period: PartitionCoefficientResponse;
  isLast: boolean;
  showAgreementLinks: boolean;
  currentSharingAgreementId?: string;
}> = ({ period, isLast, showAgreementLinks, currentSharingAgreementId }) => {
  const active = isActivePeriod(period);
  const isCurrentAgreement = period.sharingAgreement.id === currentSharingAgreementId;
  const linkable = showAgreementLinks && !isCurrentAgreement;

  return (
    <Box component="li" sx={{ display: "flex", gap: 1.5 }}>
      <Box
        sx={{
          width: RAIL_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: RAIL_TOP_OFFSET,
          flexShrink: 0,
        }}
      >
        <PeriodDot active={active} />
        {!isLast && (
          <Box
            data-testid="coefficient-history-connector"
            sx={{ flex: 1, width: "2px", bgcolor: colors.divider, my: 0.5 }}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          {linkable ? (
            <Link
              component={RouterLink}
              to={`/production/${period.plant.id}/sharing-agreements/${period.sharingAgreement.id}`}
              sx={{
                color: "primary.main",
                fontWeight: 600,
                textDecoration: "none",
                overflowWrap: "anywhere",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {period.sharingAgreement.name}
            </Link>
          ) : (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: colors.text.primary, overflowWrap: "anywhere" }}
            >
              {period.sharingAgreement.name}
            </Typography>
          )}
          <SharingAgreementStatusChip
            // The reference DTO repeats the agreement status verbatim; the two
            // enums share every member, so the chip reads it unchanged.
            status={period.sharingAgreement.status as SharingAgreementResponseStatus}
          />
        </Box>

        {isCurrentAgreement && (
          <Typography variant="caption" sx={{ display: "block", color: colors.text.subtle, mt: 0.25 }}>
            Este acuerdo
          </Typography>
        )}

        <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: fontSizes.xl, color: colors.text.primary }}>
          {formatCoefficientPercentage(period.coefficient)}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mt: 0.25 }}>
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {formatCoefficientPeriodRange(period)}
          </Typography>
          {active && (
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: radii.default,
                bgcolor: colors.success.surface,
                color: colors.success.main,
                fontSize: fontSizes.xs,
                fontWeight: 700,
              }}
            >
              En vigor
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * A supply's coefficient timeline, grouped by plant.
 *
 * Purely presentational: it receives periods and never fetches. The drawer
 * asks for one plant, the supply detail page asks for all of them, and both
 * render through here so the two surfaces cannot drift apart.
 */
export const CoefficientHistory: FC<CoefficientHistoryProps> = ({
  periods,
  isLoading = false,
  error = null,
  showAgreementLinks = false,
  currentSharingAgreementId,
  emptySubtitle,
}) => {
  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress aria-label="Cargando el histórico de coeficientes" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        No se ha podido cargar el histórico de coeficientes. Por favor, inténtalo más tarde.
      </Alert>
    );
  }

  const groups = groupCoefficientHistoryByPlant(selectAppliedPeriods(periods));

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="Sin periodos aplicados"
        subtitle={emptySubtitle ?? "Aquí aparecerán los coeficientes en cuanto la distribuidora aplique alguno."}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {groups.map((group) => (
        <Box key={group.plant.id}>
          <Typography
            component="h3"
            sx={{ fontWeight: 700, fontSize: fontSizes.lg, color: colors.text.primary, mb: 1.5 }}
          >
            {group.plant.name}
          </Typography>
          <Box
            component="ul"
            aria-label={`Periodos de ${group.plant.name}`}
            sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column" }}
          >
            {group.periods.map((period, index) => (
              <Period
                key={period.id}
                period={period}
                isLast={index === group.periods.length - 1}
                showAgreementLinks={showAgreementLinks}
                currentSharingAgreementId={currentSharingAgreementId}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
