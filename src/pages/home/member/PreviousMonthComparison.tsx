import type { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import type { MembershipEnergyMetricsResponse } from "../../../api/models";
import { LoadErrorAlert } from "../../../components/LoadErrorAlert";
import { formatMonth } from "../../../utils/formatEnergyFigures";
import { colors } from "../../../theme/tokens";
import { HomeCard } from "../HomeCard";
import { NeutralNotice } from "../NeutralNotice";
import { compareWithPreviousMonth, type ChangeDirection, type FigureComparison } from "./monthComparison";
import { useMemberEnergyMetrics, type ReferencePeriod } from "./useMemberEnergyMetrics";
import { usePreviousMonthEnergyMetrics } from "./usePreviousMonthEnergyMetrics";

const DIRECTION_ICON: Record<ChangeDirection, typeof ArrowUpwardIcon> = {
  up: ArrowUpwardIcon,
  down: ArrowDownwardIcon,
  same: RemoveIcon,
};

/**
 * One compared figure. The direction is in the words; the icon only repeats
 * it, in the text colour rather than green or red, since a change is not
 * judged here.
 */
const FigureRow: FC<{ figure: FigureComparison; currentMonth: string; previousMonth: string }> = ({
  figure,
  currentMonth,
  previousMonth,
}) => {
  if (figure.kind === "not-compared") {
    return (
      <Box component="li">
        <Typography variant="body1" component="h3" sx={{ fontWeight: 600, color: colors.text.primary }}>
          {figure.label}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.text.subtle }}>
          {figure.reason}
        </Typography>
      </Box>
    );
  }
  const Icon = DIRECTION_ICON[figure.direction];
  return (
    <Box component="li">
      <Typography variant="body1" component="h3" sx={{ fontWeight: 600, color: colors.text.primary }}>
        {figure.label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Icon fontSize="small" aria-hidden sx={{ color: colors.text.body }} />
        <Typography variant="body1" sx={{ fontWeight: 600, color: colors.text.body }}>
          {figure.change}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        {figure.current} en {currentMonth}, frente a {figure.previous} en {previousMonth}.
      </Typography>
    </Box>
  );
};

const Comparison: FC<{ current: MembershipEnergyMetricsResponse; referencePeriod: ReferencePeriod }> = ({
  current,
  referencePeriod,
}) => {
  const { metrics: previous, previousPeriod, isLoading, isError, retry } = usePreviousMonthEnergyMetrics(referencePeriod);

  if (isError) return <LoadErrorAlert message="No se pudo cargar la comparación con el mes anterior." onRetry={retry} />;
  if (isLoading || !previous) {
    return <Skeleton variant="rounded" height={240} aria-label="Cargando la comparación con el mes anterior" />;
  }

  const currentMonth = formatMonth(referencePeriod.startDate);
  const previousMonth = formatMonth(previousPeriod.startDate);
  const comparison = compareWithPreviousMonth({ current, previous, currentMonth, previousMonth });

  if (comparison.kind === "unavailable") {
    return <NeutralNotice title={comparison.title}>{comparison.text}</NeutralNotice>;
  }
  return (
    <HomeCard title={`Comparado con ${previousMonth}`} icon={CompareArrowsRoundedIcon}>
      {comparison.affectedBy && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <InfoOutlinedIcon fontSize="small" aria-hidden sx={{ color: colors.text.subtle, mt: 0.25 }} />
          <Typography variant="body2" sx={{ color: colors.text.body }}>
            {comparison.affectedBy}
          </Typography>
        </Box>
      )}
      <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {comparison.figures.map((figure) => (
          <FigureRow key={figure.label} figure={figure} currentMonth={currentMonth} previousMonth={previousMonth} />
        ))}
      </Box>
    </HomeCard>
  );
};

/**
 * The reference month against the month before it (#200). Waits for the
 * reference month and renders nothing until it resolves: its loading, failure
 * and absence are the energy half's to explain. Its own read loading or
 * failing never holds up the rest of the page.
 */
export const PreviousMonthComparison: FC = () => {
  const { metrics, referencePeriod } = useMemberEnergyMetrics();
  if (!metrics || !referencePeriod) return null;
  return <Comparison current={metrics} referencePeriod={referencePeriod} />;
};
