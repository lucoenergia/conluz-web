import type { FC } from "react";
import { Box, Chip, Typography } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import { colors } from "../../theme/tokens";
import type { Anchor, PeriodResolution } from "../period/historicalPeriod";

const GRANULARITY_LABEL = { hourly: "Por horas", daily: "Por días", monthly: "Por meses" } as const;

/**
 * What the page is showing (#248): "Datos de {periodo}", its granularity as an
 * informative chip -- never a control --, when data is published, in the
 * page's words (`publication`), and, when a range was widened to whole months,
 * what was picked and what is shown (UI-HIS-006).
 */
export const PeriodHeader: FC<{
  anchor: Anchor;
  resolution: Extract<PeriodResolution, { status: "ok" }>;
  publication: (anchor: Anchor) => string;
}> = ({ anchor, resolution, publication }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, rowGap: 0.5 }}>
      <CalendarMonthRoundedIcon sx={{ color: "primary.main" }} aria-hidden />
      <Typography variant="h6" component="h2" sx={{ color: colors.text.primary }}>
        {resolution.title}
      </Typography>
      <Chip size="small" label={GRANULARITY_LABEL[resolution.period.granularity]} sx={{ bgcolor: colors.brand.surface, color: "primary.main" }} />
    </Box>
    <Typography variant="body2" sx={{ color: colors.text.body }}>
      {publication(anchor)}
    </Typography>
    {resolution.snapped && (
      <Typography variant="body2" sx={{ color: colors.text.body }}>
        {resolution.snapped.text}
      </Typography>
    )}
  </Box>
);
