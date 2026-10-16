import type { FC, ReactNode } from "react";
import { Box, type SvgIconProps } from "@mui/material";
import { SectionHeading } from "../../../components/SectionHeading";
import { sxStyles } from "../../../theme/sx";
import { colors } from "../../../theme/tokens";
import { sectionHeadingId, sectionScrollMarginSx, type PlantSectionId } from "./plantSections";

export interface PlantSectionProps {
  /** Set when something on the screen jumps to this section. */
  id?: PlantSectionId;
  title: string;
  description: string;
  icon: FC<SvgIconProps>;
  /** The icon's colour, and the tint of the circle behind it. */
  accent?: { main: string; surface: string };
  children: ReactNode;
}

/**
 * One block of the plant detail, in the member home's language: a white card
 * headed by its icon in a tinted circle. The icon only labels the concept the
 * title already names, so it is hidden from assistive technology.
 */
export const PlantSection: FC<PlantSectionProps> = ({
  id,
  title,
  description,
  icon: Icon,
  accent = { main: colors.brand.main, surface: colors.brand.surface },
  children,
}) => {
  const headingId = id ? sectionHeadingId(id) : undefined;
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      sx={[{ ...sxStyles.softPanel, display: "flex", flexDirection: "column" }, sectionScrollMarginSx]}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: accent.surface,
            color: accent.main,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SectionHeading title={title} description={description} headingId={headingId} />
        </Box>
      </Box>
      {children}
    </Box>
  );
};
