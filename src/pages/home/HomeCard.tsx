import type { FC, ReactNode } from "react";
import { Box, Typography, type SvgIconProps, type SxProps, type Theme } from "@mui/material";
import { sxStyles } from "../../theme/sx";
import { alphas, colors, shadows } from "../../theme/tokens";

/**
 * How much a block weighs on the page: `primary` is the one figure the page
 * leads with, `action` the one block that asks something of the reader, and
 * every other block is `default`.
 */
export type HomeCardVariant = "default" | "primary" | "action";

const VARIANT_SX: Record<HomeCardVariant, SxProps<Theme>> = {
  default: {},
  primary: { boxShadow: shadows.dataCard },
  // brand.main carries white type at 5.02:1.
  action: { bgcolor: colors.brand.main, color: colors.brand.contrastText },
};

/**
 * One block of a home view: a titled panel. Its icon is a label for the
 * block's concept, so it is decorative to assistive technology: the title
 * already names it.
 */
export const HomeCard: FC<{
  title: string;
  icon?: FC<SvgIconProps>;
  variant?: HomeCardVariant;
  sx?: SxProps<Theme>;
  children: ReactNode;
}> = ({ title, icon: Icon, variant = "default", sx, children }) => {
  const onBrand = variant === "action";
  return (
    <Box
      component="section"
      aria-label={title}
      sx={[{ ...sxStyles.softPanel, display: "flex", flexDirection: "column", gap: 1.5 }, VARIANT_SX[variant], ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        {Icon && (
          <Box
            aria-hidden
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: "50%",
              bgcolor: onBrand ? alphas.white.soft : colors.brand.surface,
              color: onBrand ? colors.brand.contrastText : colors.brand.main,
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )}
        <Typography
          variant="subtitle1"
          component="h2"
          sx={{ fontWeight: 600, color: onBrand ? colors.brand.contrastText : colors.text.primary }}
        >
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
};
