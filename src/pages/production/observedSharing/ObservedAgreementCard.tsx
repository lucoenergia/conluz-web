import type { FC } from "react";
import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { SharingAgreementStatusChip } from "../../../components/SharingAgreementStatusChip";
import { sxStyles } from "../../../theme/sx";
import { colors, radii } from "../../../theme/tokens";
import { ANOMALY_COUNT_ORDER, ANOMALY_TYPE_LABEL, COEFFICIENT_STATUS_LABEL, STATUS_COUNT_ORDER } from "./observedSharingLabels";
import { formatAgreementApplication, formatDay, formatPercentageOrNone } from "./observedSharingFormat";
import { agreementObservationPath } from "./observedSharingRoutes";
import type { SharingAgreementObservationSummaryResponse } from "../../../api/models";
import { RecommendationList } from "./RecommendationList";

const sectionLabelSx = { color: colors.text.subtle, fontWeight: 600 } as const;

const CountRow: FC<{ label: string; count: number }> = ({ label, count }) => (
  <Box component="li" sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
    <Typography variant="body2" sx={{ color: colors.text.body }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {count}
    </Typography>
  </Box>
);

const countListSx = { listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.25 } as const;

/** "Salen del reparto: 2 · 1 con fecha distinta", only when some supply leaves with the agreement. */
function leavingText(summary: SharingAgreementObservationSummaryResponse): string | undefined {
  const counts = summary.leavingStatusCounts;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return undefined;
  const different = counts.appliedDifferentDate;
  return different > 0 ? `Salen del reparto: ${total} · ${different} con fecha distinta` : `Salen del reparto: ${total}`;
}

interface ObservedAgreementCardProps {
  plantId: string;
  summary: SharingAgreementObservationSummaryResponse;
  /** Supplies of the plant without any valid day, whose registered share the unexplained part includes. */
  suppliesWithoutDataCount: number;
}

/**
 * One agreement as the analysis observed it (UI-AGR-023): its sent date, when
 * it was applied, its status counts, its anomalies by type, the part no supply
 * with data received, and its recommendations.
 */
export const ObservedAgreementCard: FC<ObservedAgreementCardProps> = ({ plantId, summary, suppliesWithoutDataCount }) => {
  const agreement = summary.sharingAgreement;
  const anomalyCount = summary.anomalies.length;
  const leaving = leavingText(summary);
  const unallocated = summary.unallocatedShare;

  return (
    <Box
      component="article"
      aria-labelledby={`observed-agreement-${agreement.id}`}
      sx={{
        ...sxStyles.softPanel,
        border: `1px solid ${colors.border.light}`,
        borderRadius: radii.large,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75 }}>
        <Link
          id={`observed-agreement-${agreement.id}`}
          component={RouterLink}
          to={agreementObservationPath(plantId, agreement.id)}
          variant="h6"
          sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
        >
          {agreement.name}
        </Link>
        <SharingAgreementStatusChip status={agreement.status} />
        <Typography variant="body2" sx={{ color: colors.text.body }}>
          {summary.distributorFileSentOn ? `Fichero enviado el ${formatDay(summary.distributorFileSentOn)}` : "Sin registrar"}
        </Typography>
        <Typography sx={{ fontWeight: 600 }}>{formatAgreementApplication(summary)}</Typography>
      </Box>

      <Box>
        <Typography variant="body2" sx={sectionLabelSx}>
          Puntos de suministro
        </Typography>
        <Box component="ul" sx={countListSx}>
          {STATUS_COUNT_ORDER.map(({ status, count }) => (
            <CountRow key={status} label={COEFFICIENT_STATUS_LABEL[status]} count={summary.coefficientStatusCounts[count]} />
          ))}
        </Box>
        {leaving && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, pt: 0.5, borderTop: `1px solid ${colors.divider}`, color: colors.text.body }}
          >
            {leaving}
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="body2" sx={sectionLabelSx}>
          {anomalyCount > 0 ? `Anomalías · ${anomalyCount}` : "Anomalías"}
        </Typography>
        {anomalyCount === 0 ? (
          <Typography variant="body2" sx={{ color: colors.text.body }}>
            Sin anomalías
          </Typography>
        ) : (
          <Box component="ul" sx={countListSx}>
            {ANOMALY_COUNT_ORDER.filter(({ count }) => summary.anomalyCounts[count] > 0).map(({ type, count }) => (
              <CountRow key={type} label={ANOMALY_TYPE_LABEL[type]} count={summary.anomalyCounts[count]} />
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Typography variant="body2" sx={sectionLabelSx}>
          Sin explicar (1 − Σβ)
        </Typography>
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatPercentageOrNone(unallocated?.unallocated, 1)}
        </Typography>
        {unallocated && unallocated.registeredShareWithoutData > 0 && suppliesWithoutDataCount > 0 && (
          <Typography variant="body2" sx={{ color: colors.text.subtle }}>
            {formatPercentageOrNone(unallocated.registeredShareWithoutData, 1)} es de{" "}
            {suppliesWithoutDataCount === 1 ? "el punto sin datos" : `los ${suppliesWithoutDataCount} puntos sin datos`}
          </Typography>
        )}
      </Box>

      <RecommendationList plantId={plantId} sharingAgreementId={agreement.id} recommendations={summary.recommendations} />
    </Box>
  );
};
