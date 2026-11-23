import type { FC } from "react";
import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import { SharingAgreementStatusChip } from "../../../components/SharingAgreementStatusChip";
import { sxStyles } from "../../../theme/sx";
import { colors, radii } from "../../../theme/tokens";
import {
  ANOMALY_COUNT_ORDER,
  ANOMALY_TYPE_LABEL,
  COEFFICIENT_STATUS_LABEL,
  STATUS_COUNT_ORDER,
  UNATTRIBUTED_PRODUCTION_LABEL,
} from "./observedSharingLabels";
import { formatAgreementApplication, formatDay } from "./observedSharingFormat";
import { agreementObservationPath } from "./observedSharingRoutes";
import type { SharingAgreementObservationSummaryResponse } from "../../../api/models";
import { RecommendationFindings } from "./RecommendationFindings";
import { UnattributedProduction } from "./UnattributedProduction";
import { recommendationFindings } from "./recommendationFindings";

const sectionLabelSx = { color: colors.text.subtle, fontWeight: 600 } as const;

/**
 * A count before its label, in a column of tabular figures so the counts
 * align. A zero reads in the secondary text colour, so the rows that hold
 * something stand out (UI-AGR-023).
 */
const CountRow: FC<{ label: string; count: number }> = ({ label, count }) => (
  <Box
    component="li"
    sx={{ display: "flex", alignItems: "baseline", gap: 1, color: count === 0 ? "text.secondary" : colors.text.body }}
  >
    <Typography
      component="span"
      variant="body2"
      sx={{
        minWidth: "3ch",
        flexShrink: 0,
        textAlign: "right",
        fontWeight: count === 0 ? 400 : 600,
        fontVariantNumeric: "tabular-nums",
        color: "inherit",
      }}
    >
      {count}
    </Typography>{" "}
    <Typography component="span" variant="body2" sx={{ color: "inherit" }}>
      {label}
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
}

/**
 * One agreement as the analysis observed it (UI-AGR-023): its sent date, when
 * it was applied, its status counts, its anomalies by type, the part no supply
 * with data received, and its recommendations.
 */
export const ObservedAgreementCard: FC<ObservedAgreementCardProps> = ({ plantId, summary }) => {
  const agreement = summary.sharingAgreement;
  const findings = recommendationFindings(plantId, summary);
  const anomalyCount = summary.anomalies.length;
  const leaving = leavingText(summary);

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
          {summary.distributorFileSentOn
            ? `Fichero enviado el ${formatDay(summary.distributorFileSentOn)}`
            : "Fichero enviado: sin registrar"}
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
          {UNATTRIBUTED_PRODUCTION_LABEL}
        </Typography>
        <UnattributedProduction share={summary.unallocatedShare} variant="body1" />
      </Box>

      {findings.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ ...sectionLabelSx, mb: 0.75 }}>
            Qué revisar
          </Typography>
          <RecommendationFindings findings={findings} compact />
        </Box>
      )}
    </Box>
  );
};
