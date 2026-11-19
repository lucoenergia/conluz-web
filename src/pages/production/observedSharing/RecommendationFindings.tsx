import type { FC } from "react";
import { Box, Link, Typography } from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Link as RouterLink } from "react-router";
import { colors } from "../../../theme/tokens";
import type { FindingTone, RecommendationFinding } from "./recommendationFindings";

const ICON: Record<FindingTone, typeof SearchOffIcon> = {
  accent: CalendarMonthRoundedIcon,
  neutral: SearchOffIcon,
  warning: WarningAmberRoundedIcon,
};

const ICON_COLOR: Record<FindingTone, string> = {
  accent: colors.brand.main,
  neutral: colors.secondary.main,
  warning: colors.warning.main,
};

/**
 * An agreement's findings, one row each: an icon, what was found, its detail
 * and, where there is one, a link to act on it. `compact` for a card.
 */
export const RecommendationFindings: FC<{ findings: RecommendationFinding[]; compact?: boolean }> = ({
  findings,
  compact = false,
}) => (
  <Box
    component="ul"
    sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: compact ? 1 : 2 }}
  >
    {findings.map(({ recommendation, tone, title, detail, link }) => {
      const Icon = ICON[tone];
      return (
        <Box component="li" key={recommendation} sx={{ display: "flex", alignItems: "flex-start", gap: compact ? 1 : 1.5 }}>
          <Icon aria-hidden sx={{ color: ICON_COLOR[tone], fontSize: compact ? 18 : 22, mt: compact ? 0.125 : 0, flexShrink: 0 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
            <Typography variant={compact ? "body2" : "body1"} sx={{ fontWeight: 600, color: colors.text.primary }}>
              {title}
            </Typography>
            {detail && (
              <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                {detail}
              </Typography>
            )}
            {link && (
              <Link component={RouterLink} to={link.to} variant="body2" sx={{ fontWeight: 600, alignSelf: "flex-start" }}>
                {link.label}
              </Link>
            )}
          </Box>
        </Box>
      );
    })}
  </Box>
);
