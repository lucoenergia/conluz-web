import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import type { MembershipEnergyMetricsResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { formatMonth } from "../../utils/formatEnergyFigures";
import { sxStyles } from "../../theme/sx";
import { colors, fontSizes } from "../../theme/tokens";
import { HomeViewSwitch } from "./HomeViewSwitch";
import { BestHours } from "./member/BestHours";
import { EnergyJourney } from "./member/EnergyJourney";
import { HomeCard } from "./HomeCard";
import { chooseMemberHomeMessage, type MemberHomeMessage } from "./member/memberHomeMessage";
import { NeutralNotice } from "./NeutralNotice";
import { PaybackCard } from "./member/PaybackCard";
import { PreviousMonthComparison } from "./member/PreviousMonthComparison";
import { SavingsCard } from "./member/SavingsCard";
import { TwelveMonthSeries } from "./member/TwelveMonthSeries";
import { useMemberEnergyMetrics, type ReferencePeriod } from "./member/useMemberEnergyMetrics";
import { useMemberPayback } from "./member/useMemberPayback";

/**
 * The member's home (#199), led since #231 by the share of the assigned energy
 * the member used: the journey of their energy in the latest month
 * the distributor has published, what it saved them, and how far they are from
 * recovering their investment; how the month compares with the one before it
 * (#200); and the twelve months leading up to it and the hours of the day when
 * community energy is there to use (#201). Their total in the active
 * community -- no supply is singled out, and no period is chosen.
 *
 * The reads are independent: any of them can fail, and the rest still
 * renders.
 */
export const MemberHomePage: FC = () => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
    <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
      Tu energía
    </Typography>
    <HomeViewSwitch current="member" />
    <ReferenceMonthHeader />
    {/* The figure the page leads with, beside the one block that asks something of the reader, which keeps its own height. */}
    <Box sx={{ ...ROW, alignItems: "flex-start", "& > *": { ...ROW["& > *"], flex: "2 1 300px", minWidth: 0 }, "& > :first-child": { flex: "3 1 480px" } }}>
      <Journey />
      <Advice />
    </Box>
    <BestHours />
    {/* The comparison stays below the journey's consumption bar, whose change it reports. */}
    <Box sx={{ ...ROW, "& > *": { ...ROW["& > *"], flex: "1 1 260px", minWidth: 0 } }}>
      <Savings />
      <PreviousMonthComparison />
      <PaybackHalf />
    </Box>
    <TwelveMonthSeries />
  </Box>
);

/**
 * Blocks side by side where the width allows, stacked where it does not; one
 * scrolling page at any width. A row whose blocks are all waiting on their
 * reads takes no room.
 */
const ROW = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "stretch",
  gap: 3,
  "&:empty": { display: "none" },
  // Each block's basis is its whole width, padding included.
  "& > *": { boxSizing: "border-box" },
} as const;

interface ResolvedMonth {
  metrics: MembershipEnergyMetricsResponse;
  referencePeriod: ReferencePeriod;
  month: string;
  message: MemberHomeMessage | null;
}

/**
 * The reference month once it has resolved, or null. The blocks built from it
 * render nothing until then: its loading, failure and absence are the header's
 * to explain, once.
 */
function useResolvedMonth(): ResolvedMonth | null {
  const { metrics, referencePeriod } = useMemberEnergyMetrics();
  if (!metrics || !referencePeriod) return null;
  const message =
    metrics.selfConsumptionRatio === null
      ? null
      : chooseMemberHomeMessage({
          coverage: metrics.coverage,
          selfConsumptionRatio: metrics.selfConsumptionRatio,
          surplusKWh: metrics.energy.surplusKWh,
        });
  return { metrics, referencePeriod, month: formatMonth(referencePeriod.startDate), message };
}

/** Which month the figures belong to, and the one place the energy read's loading, failure and absence are explained. */
const ReferenceMonthHeader: FC = () => {
  const { metrics, isLoading, isError, retry } = useMemberEnergyMetrics();
  const resolved = useResolvedMonth();

  if (isError) return <LoadErrorAlert message="No se pudieron cargar los datos de tu energía." onRetry={retry} />;
  if (isLoading || !metrics) return <Skeleton variant="rounded" height={320} aria-label="Cargando los datos de tu energía" />;
  if (!resolved) {
    return (
      <NeutralNotice title="Todavía no hay datos de tu energía">
        Aparecerán cuando la distribuidora publique el primer mes en que se te haya asignado energía de la comunidad. Los
        datos de cada mes se publican hacia el día 10 del mes siguiente.
      </NeutralNotice>
    );
  }

  return (
    <>
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarMonthRoundedIcon aria-hidden sx={{ color: colors.brand.main }} />
          <Typography variant="h6" component="p" sx={{ color: colors.text.primary }}>
            Datos de {resolved.month}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Es el último mes completo que ha publicado la distribuidora: los datos de cada mes se publican hacia el día 10
          del mes siguiente.
        </Typography>
      </Box>
      {resolved.message?.kind === "partial-month" && <NeutralNotice>{resolved.message.text}</NeutralNotice>}
    </>
  );
};

const Journey: FC = () => {
  const resolved = useResolvedMonth();
  return resolved && <EnergyJourney metrics={resolved.metrics} />;
};

const Savings: FC = () => {
  const resolved = useResolvedMonth();
  return resolved && <SavingsCard metrics={resolved.metrics} month={resolved.month} />;
};

const Advice: FC = () => {
  const message = useResolvedMonth()?.message;
  if (message?.kind !== "advice") return null;
  return (
    <HomeCard title="Qué puedes hacer" icon={LightbulbRoundedIcon} variant="action">
      <Typography variant="body1" sx={{ fontSize: fontSizes["2xl"], color: colors.brand.contrastText }}>
        {message.text}
      </Typography>
    </HomeCard>
  );
};

const PaybackHalf: FC = () => {
  const { payback, isLoading, isError, retry } = useMemberPayback();

  if (isError) return <LoadErrorAlert message="No se pudo cargar la recuperación de tu inversión." onRetry={retry} />;
  if (isLoading || !payback) return <Skeleton variant="rounded" height={160} aria-label="Cargando la recuperación de tu inversión" />;
  return <PaybackCard payback={payback} />;
};
