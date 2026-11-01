import type { FC } from "react";
import { Box, Chip, Typography } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import { colors } from "../../theme/tokens";
import { monthYearName, type CalendarMonth, type PeriodResolution } from "./historicalPeriod";

const GRANULARITY_LABEL = { daily: "Por días", monthly: "Por meses" } as const;

const publicationText = (anchor: CalendarMonth) =>
  "Los datos de cada mes se publican hacia el día 10 del mes siguiente, así que lo más reciente que puedes ver es " +
  `${monthYearName(anchor)}.`;

/**
 * What the page is showing (#248): "Datos de {periodo}", its granularity as an
 * informative chip -- never a control --, when data is published, and, when a
 * range was widened to whole months, what was picked and what is shown
 * (UI-HIS-006).
 */
export const PeriodHeader: FC<{ anchor: CalendarMonth; resolution: Extract<PeriodResolution, { status: "ok" }> }> = ({
  anchor,
  resolution,
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, rowGap: 0.5 }}>
      <CalendarMonthRoundedIcon sx={{ color: "primary.main" }} aria-hidden />
      <Typography variant="h6" component="h2" sx={{ color: colors.text.primary }}>
        {resolution.title}
      </Typography>
      <Chip size="small" label={GRANULARITY_LABEL[resolution.period.granularity]} sx={{ bgcolor: colors.brand.surface, color: "primary.main" }} />
    </Box>
    <Typography variant="body2" sx={{ color: colors.text.body }}>
      {publicationText(anchor)}
    </Typography>
    {resolution.snapped && (
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {resolution.snapped.text}
      </Typography>
    )}
  </Box>
);
