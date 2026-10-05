import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import type { MembershipEnergyMetricsResponse } from "../../api/models";
import { LoadErrorAlert } from "../../components/LoadErrorAlert";
import { formatMonth } from "../../utils/formatEnergyFigures";
import { sxStyles } from "../../theme/sx";
import { colors } from "../../theme/tokens";
import { EnergyJourney } from "./member/EnergyJourney";
import { HomeCard } from "./member/HomeCard";
import { chooseMemberHomeMessage } from "./member/memberHomeMessage";
import { NeutralNotice } from "./member/NeutralNotice";
import { PaybackCard } from "./member/PaybackCard";
import { SavingsCard } from "./member/SavingsCard";
import { useMemberEnergyMetrics, type ReferencePeriod } from "./member/useMemberEnergyMetrics";
import { useMemberPayback } from "./member/useMemberPayback";

/**
 * The member's home (#199): the journey of their energy in the latest month
 * the distributor has published, what it saved them, and how far they are from
 * recovering their investment. Their total in the active community -- no
 * supply is singled out, and no period is chosen.
 *
 * The two reads are independent: either can fail, and the other half still
 * renders.
 *
 * No view switch here until the management view has content (#198): its tab
 * would lead an admin to a placeholder.
 */
export const MemberHomePage: FC = () => (
  <Box sx={{ ...sxStyles.pageContainer, p: { xs: 2, sm: 4 }, maxWidth: 960, display: "flex", flexDirection: "column", gap: 3 }}>
    <Typography variant="h4" component="h1" sx={{ color: colors.text.primary }}>
      Tu energía
    </Typography>
    <EnergyHalf />
    <PaybackHalf />
  </Box>
);

const EnergyHalf: FC = () => {
  const { metrics, referencePeriod, isLoading, isError, retry } = useMemberEnergyMetrics();

  if (isError) return <LoadErrorAlert message="No se pudieron cargar los datos de tu energía." onRetry={retry} />;
  if (isLoading || !metrics) return <Skeleton variant="rounded" height={320} aria-label="Cargando los datos de tu energía" />;
  if (!referencePeriod) {
    return (
      <NeutralNotice title="Todavía no hay datos de tu energía">
        Aparecerán cuando la distribuidora publique el primer mes en que se te haya asignado energía de la comunidad. Los
        datos de cada mes se publican hacia el día 10 del mes siguiente.
      </NeutralNotice>
    );
  }
  return <ReferenceMonth metrics={metrics} referencePeriod={referencePeriod} />;
};

const ReferenceMonth: FC<{ metrics: MembershipEnergyMetricsResponse; referencePeriod: ReferencePeriod }> = ({
  metrics,
  referencePeriod,
}) => {
  const month = formatMonth(referencePeriod.startDate);
  const message =
    metrics.selfConsumptionRatio === null
      ? null
      : chooseMemberHomeMessage({
          coverage: metrics.coverage,
          selfConsumptionRatio: metrics.selfConsumptionRatio,
          surplusKWh: metrics.energy.surplusKWh,
        });

  return (
    <>
      <Box>
        <Typography variant="h6" component="p" sx={{ color: colors.text.primary }}>
          Datos de {month}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          Es el último mes completo que ha publicado la distribuidora: los datos de cada mes se publican hacia el día 10
          del mes siguiente.
        </Typography>
      </Box>
      {message?.kind === "partial-month" && <NeutralNotice>{message.text}</NeutralNotice>}
      <EnergyJourney metrics={metrics} />
      <SavingsCard metrics={metrics} month={month} />
      {message?.kind === "advice" && (
        <HomeCard title="Qué puedes hacer">
          <Typography variant="body1" sx={{ color: colors.text.body }}>
            {message.text}
          </Typography>
        </HomeCard>
      )}
    </>
  );
};

const PaybackHalf: FC = () => {
  const { payback, isLoading, isError, retry } = useMemberPayback();

  if (isError) return <LoadErrorAlert message="No se pudo cargar la recuperación de tu inversión." onRetry={retry} />;
  if (isLoading || !payback) return <Skeleton variant="rounded" height={160} aria-label="Cargando la recuperación de tu inversión" />;
  return <PaybackCard payback={payback} />;
};
