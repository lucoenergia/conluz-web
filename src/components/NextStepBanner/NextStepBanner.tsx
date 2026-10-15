import type { FC, ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { colors, fontSizes, radii } from "../../theme/tokens";

export interface NextStepBannerProps {
  /** The one sentence saying what to do now. */
  headline?: ReactNode;
  /** A closed state is tinted slate rather than brand, so it never reads as live. */
  isClosed?: boolean;
  /** What follows the headline: the actions, and anything that explains them. */
  children?: ReactNode;
}

/**
 * The "Siguiente paso" block: a brand-coloured card with one sentence saying
 * what to do now, and below it whatever the screen puts there. It decides
 * nothing; the screen chooses the step and the actions.
 */
export const NextStepBanner: FC<NextStepBannerProps> = ({ headline, isClosed = false, children }) => (
  <Box
    sx={{
      bgcolor: isClosed ? colors.secondary.main : colors.brand.main,
      borderRadius: { xs: 0, sm: radii.large },
      p: { xs: 2, sm: 3 },
      display: "flex",
      flexDirection: "column",
      gap: { xs: 1.5, sm: 2 },
    }}
  >
    <Box>
      <Typography
        component="p"
        sx={{
          fontSize: fontSizes.xs,
          fontWeight: 500,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: colors.brand.onSoft,
        }}
      >
        Siguiente paso
      </Typography>
      {headline && (
        <Typography
          component="p"
          sx={{
            mt: 1,
            fontSize: { xs: fontSizes["2xl"], sm: "1.25rem" },
            fontWeight: 600,
            lineHeight: 1.35,
            color: colors.brand.contrastText,
            textWrap: "pretty",
          }}
        >
          {headline}
        </Typography>
      )}
    </Box>
    {children}
  </Box>
);
