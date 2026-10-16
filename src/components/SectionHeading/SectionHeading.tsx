import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import { colors, fontSizes } from "../../theme/tokens";

export interface SectionHeadingProps {
  title: string;
  /** One line saying what this section is for, in the product's own words. */
  description: string;
  /**
   * Makes the title a target the screen can move focus to after a jump to its
   * section: it carries this id and takes focus from code, never from Tab.
   */
  headingId?: string;
}

/**
 * A titled section of the detail page. The description is not decoration: a
 * first-time admin cannot tell what "Reparto" or "Fichero para la
 * distribuidora" mean, or in which order to deal with them, from the title
 * alone — which is the specific failure this heading exists to fix.
 */
export const SectionHeading: FC<SectionHeadingProps> = ({ title, description, headingId }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography
      variant="h6"
      component="h2"
      id={headingId}
      tabIndex={headingId ? -1 : undefined}
      // No focus ring when a pointer started the jump; a keyboard user still gets one.
      sx={{ fontWeight: 700, color: colors.text.primary, "&:focus:not(:focus-visible)": { outline: "none" } }}
    >
      {title}
    </Typography>
    <Typography
      sx={{ mt: 0.75, fontSize: fontSizes.xl, lineHeight: 1.5, color: colors.text.secondary, textWrap: "pretty" }}
    >
      {description}
    </Typography>
  </Box>
);
