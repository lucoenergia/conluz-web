import { useMemo, type FC } from "react";
import { Skeleton } from "@mui/material";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { LoadErrorAlert } from "../../components/LoadErrorAlert/LoadErrorAlert";
import { Evolution } from "../../components/evolution/Evolution";
import { useHistoricalPeriod } from "../../components/period/HistoricalPeriodContext";
import type { HistoricalPeriod } from "../../components/period/historicalPeriod";
import { HomeCard } from "../home/HomeCard";
import { COMMUNITY_EVOLUTION_COPY, COMMUNITY_LOOK, toCommunitySeriesView, type CommunitySeries } from "./communitySeries";
import { useCommunityEnergySeries } from "./useCommunityEnergySeries";

export const EVOLUTION_LOADING_LABEL = "Cargando la evolución de la energía de la comunidad…";
export const EVOLUTION_LOAD_ERROR = "No se pudo cargar la evolución de la energía de la comunidad. Comprueba tu conexión e inténtalo de nuevo.";

const ReadyEvolution: FC<{ period: HistoricalPeriod; series: CommunitySeries }> = ({ period, series }) => {
  const view = useMemo(() => toCommunitySeriesView(period, series), [period, series]);
  return (
    <HomeCard title={COMMUNITY_EVOLUTION_COPY.title[view.granularity]} icon={BarChartRoundedIcon}>
      {/* The series has no savings, so no price is asked for or shown (UI-CAN-007). */}
      <Evolution view={view} look={COMMUNITY_LOOK} copy={COMMUNITY_EVOLUTION_COPY} extraLines={[]} priceLabel={null} />
    </HomeCard>
  );
};

/**
 * The community's energy over the selected period, bucket by bucket (#403).
 * Nothing renders, and nothing is fetched, until the period is known.
 */
export const CommunityEvolution: FC = () => {
  const period = useHistoricalPeriod();
  const state = useCommunityEnergySeries();
  if (!period) return null;
  if (state.status === "error") return <LoadErrorAlert message={EVOLUTION_LOAD_ERROR} onRetry={state.retry} />;
  if (state.status === "loading") return <Skeleton variant="rounded" height={520} role="progressbar" aria-label={EVOLUTION_LOADING_LABEL} />;
  return <ReadyEvolution period={period} series={state.series} />;
};
