import type { FC } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { communityInitials } from "../../utils/communityInitials";
import { colors, fontSizes, radii } from "../../theme/tokens";

interface CommunityScopeHeaderProps {
  /** The community the confirmed write lands in. Undefined while it loads. */
  name: string | undefined;
  /** `onBrand` for a header sitting on the brand-coloured page banner. */
  tone?: "default" | "onBrand";
}

const AVATAR_SIZE = 24;

/**
 * The header line of a surface that confirms a write into a community:
 * initials and "Comunidad · {name}" (#186). The surface's title names the
 * community as well; this line is the part that reads the same everywhere.
 */
export const CommunityScopeHeader: FC<CommunityScopeHeaderProps> = ({ name, tone = "default" }) => {
  const onBrand = tone === "onBrand";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, mb: 1.5 }}>
      <Avatar
        aria-hidden
        sx={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          fontSize: fontSizes.xs,
          fontWeight: 700,
          borderRadius: radii.small,
          // An explicit panel tone, not a white alpha: type sits on it.
          bgcolor: onBrand ? colors.brand.panel : colors.brand.surface,
          color: onBrand ? colors.brand.contrastText : colors.brand.main,
        }}
      >
        {communityInitials(name)}
      </Avatar>
      <Typography
        sx={{
          fontSize: fontSizes.sm,
          fontWeight: 600,
          color: onBrand ? colors.brand.onSoft : colors.text.subtle,
          overflowWrap: "anywhere",
        }}
      >
        Comunidad · {name ?? "cargando…"}
      </Typography>
    </Box>
  );
};
