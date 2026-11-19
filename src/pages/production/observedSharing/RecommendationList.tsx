import type { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import type { SharingAgreementObservationSummaryResponseRecommendationsItem as Recommendation } from "../../../api/models";
import { colors } from "../../../theme/tokens";
import { ObservationChip } from "./ObservationChip";
import { actionableRecommendations, RECOMMENDATION_COPY, type ActionableRecommendation } from "./observedSharingLabels";
import { agreementObservationPath, OBSERVED_ANOMALIES_ANCHOR } from "./observedSharingRoutes";

interface RecommendationListProps {
  plantId: string;
  sharingAgreementId: string;
  /** In the order the analysis returned them. Empty when the plant is not computable. */
  recommendations: Recommendation[];
  /** Off where a heading above already says "Recomendaciones". */
  showLabel?: boolean;
}

/**
 * Where each recommendation's action goes. It only navigates: "Fijar fechas"
 * has no action until the set-dates flow ships (#419), so it shows its label
 * and sentence alone.
 */
function actionOf(recommendation: ActionableRecommendation, plantId: string, sharingAgreementId: string) {
  switch (recommendation) {
    case "DEACTIVATE":
      return { label: "Ir a desactivar", to: `/plants/${plantId}/sharing-agreements/${sharingAgreementId}` };
    case "REVIEW_ANOMALIES":
      return {
        label: "Revisar anomalías",
        to: `${agreementObservationPath(plantId, sharingAgreementId)}#${OBSERVED_ANOMALIES_ANCHOR}`,
      };
    case "SET_DATES":
      return undefined;
  }
}

/**
 * An agreement's recommendations, in the order the analysis returned them,
 * each with its fixed sentence and its action. "Ninguna" when the analysis
 * recommends nothing, and nothing at all when it returned none (a plant that
 * is not computable).
 */
export const RecommendationList: FC<RecommendationListProps> = ({
  plantId,
  sharingAgreementId,
  recommendations,
  showLabel = true,
}) => {
  if (recommendations.length === 0) return null;
  const actionable = actionableRecommendations(recommendations);
  if (actionable.length === 0) {
    return <Typography variant="body2">{showLabel ? "Recomendación: Ninguna" : "Ninguna"}</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {showLabel && (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {actionable.length === 1 ? "Recomendación:" : "Recomendaciones:"}
        </Typography>
      )}
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {actionable.map((recommendation) => {
          const copy = RECOMMENDATION_COPY[recommendation];
          const action = actionOf(recommendation, plantId, sharingAgreementId);
          return (
            <Box component="li" key={recommendation} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.75 }}>
              <ObservationChip label={copy.label} tone={copy.tone} />
              <Typography variant="body2" sx={{ color: colors.text.body }}>
                {copy.sentence}
              </Typography>
              {action && (
                <Button variant="outlined" size="small" component={RouterLink} to={action.to}>
                  {action.label}
                </Button>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
