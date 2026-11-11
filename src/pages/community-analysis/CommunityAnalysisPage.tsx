import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { useActiveCommunity } from "../../context/community.context";
import { ActionStatus } from "../../components/ActionStatus/ActionStatus";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { Notice } from "../../components/Notice/Notice";
import { NeutralNotice } from "../../components/EnergyFigures/NeutralNotice";
import { PeriodHeader } from "../../components/EnergyFigures/PeriodHeader";
import { HistoricalPeriodContext, useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import { PeriodSelector } from "../../components/period/PeriodSelector";
import { useHistoricalAnchor, type HistoricalAnchor } from "../../components/period/useHistoricalAnchor";
import { useHistoricalPeriodState, type HistoricalPeriodState } from "../../components/period/useHistoricalPeriodState";
import { memberPublicationText } from "../historical-analysis/memberPeriod";
import { readMonthAnchor } from "../historical-analysis/useMemberAnchorQuery";
import { CommunityEvolution } from "./CommunityEvolution";
import { CommunityFigures } from "./CommunityFigures";
import { CommunityHeader } from "./CommunityHeader";
import { CommunityJourney } from "./CommunityJourney";
import { CommunityPlants } from "./CommunityPlants";
import { coverageNotice } from "./communityFigureTexts";
import { COMMUNITY_DEFAULT_PRESET, COMMUNITY_PRESETS, communityClampNotice } from "./communityPeriod";
import { useCommunityAnchorQuery } from "./useCommunityAnchorQuery";
import { useCommunityPeriodMetrics } from "./useCommunityPeriodMetrics";

export const PAGE_TITLE = "Energía de la comunidad";
export const ANCHOR_LOADING_LABEL = "Cargando la energía de la comunidad…";
export const ANCHOR_ERROR = "No se pudo cargar la energía de la comunidad. Comprueba tu conexión e inténtalo de nuevo.";
export const NO_DATA_TITLE = "Todavía no hay datos publicados";
export const NO_DATA_BODY =
  "La distribuidora publica los datos de cada mes hacia el día 10 del mes siguiente. Los verás aquí en cuanto se publique el primer mes de la comunidad.";
export const METRICS_LOADING_LABEL = "Cargando las cifras de la comunidad…";
export const METRICS_LOAD_ERROR = "No se pudieron cargar las cifras de la comunidad. Comprueba tu conexión e inténtalo de nuevo.";


/**
 * "Energía de la comunidad": what the active community's plants produced over
 * a period, where that energy went, what the exported part earned, the CO₂
 * avoided, and each plant's share (#403). The period works as on "Mi consumo
 * y ahorro" (#248), anchored to the community's latest published month. The
 * same page for every member, admins included; no member, supply or
 * per-supply figure appears on it (UI-CAN-003).
 */
export const CommunityAnalysisPage: FC = () => {
  const communityId = useActiveCommunity();
  const anchorQuery = useCommunityAnchorQuery();
  const anchor = useHistoricalAnchor(anchorQuery, readMonthAnchor);
  const period = useHistoricalPeriodState(anchor, {
    presets: COMMUNITY_PRESETS,
    defaultPreset: COMMUNITY_DEFAULT_PRESET,
    scopeKey: communityId ?? "",
    clampNotice: communityClampNotice,
  });

  return (
    <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
          {PAGE_TITLE}
        </Typography>
        {anchorQuery.data && <CommunityHeader metrics={anchorQuery.data} />}
      </Box>
      {anchor.status === "loading" && (
        <Skeleton variant="rounded" height={56} role="progressbar" aria-label={ANCHOR_LOADING_LABEL} sx={{ maxWidth: 560 }} />
      )}
      {anchor.status === "ready" && (
        <Box sx={{ maxWidth: 560 }}>
          <PeriodSelector anchor={anchor.anchor} presets={COMMUNITY_PRESETS} selection={period.selection} onSelect={period.select} />
        </Box>
      )}
      {/* Mounted before the anchor resolves, so a clamp the page arrives with is announced. */}
      <ActionStatus message={period.clampNotice} />
      <AnchoredContent anchor={anchor} period={period} />
    </Box>
  );
};

/** What hangs off the community's latest published month (UI-CAN-002). */
const AnchoredContent: FC<{ anchor: HistoricalAnchor; period: HistoricalPeriodState }> = ({ anchor, period }) => {
  switch (anchor.status) {
    case "loading":
      return null;
    case "error":
      return <LoadErrorAlert message={ANCHOR_ERROR} onRetry={anchor.retry} />;
    case "none":
      // Neutral, not a failure: nothing is published yet for the community.
      return <NeutralNotice title={NO_DATA_TITLE}>{NO_DATA_BODY}</NeutralNotice>;
    case "ready": {
      const { resolution } = period;
      const resolved = resolution?.status === "ok" ? resolution : null;
      return (
        <>
          {period.clampNotice && <Notice severity="info">{period.clampNotice}</Notice>}
          {resolved && <PeriodHeader anchor={anchor.anchor} resolution={resolved} publication={memberPublicationText} />}
          <HistoricalPeriodContext.Provider value={resolved?.period}>
            <PeriodContent />
          </HistoricalPeriodContext.Provider>
        </>
      );
    }
  }
};

/** The period's figures, its evolution and its plants. Nothing renders, and nothing is fetched, until the period is known. */
const PeriodContent: FC = () => {
  const period = useHistoricalPeriod();
  const state = useCommunityPeriodMetrics();
  if (!period) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {state.status === "loading" && <Skeleton variant="rounded" height={280} role="progressbar" aria-label={METRICS_LOADING_LABEL} />}
      {state.status === "error" && <LoadErrorAlert message={METRICS_LOAD_ERROR} onRetry={state.retry} />}
      {state.status === "ready" && (
        <>
          {/* Stated from the response's own coverage, never inferred from the figures. */}
          {state.metrics.coverage.suppliesWithData < state.metrics.coverage.supplyCount && (
            <NeutralNotice>{coverageNotice(state.metrics.coverage.suppliesWithData, state.metrics.coverage.supplyCount)}</NeutralNotice>
          )}
          <CommunityJourney metrics={state.metrics} />
          <CommunityFigures metrics={state.metrics} />
        </>
      )}
      <CommunityEvolution />
      {state.status === "ready" && <CommunityPlants plants={state.metrics.plants} />}
    </Box>
  );
};
