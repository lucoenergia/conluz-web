import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import type { FC } from "react";
import { colors } from "../../theme/tokens";

interface LogoProps {
  responsive?: boolean;
}

export const Logo: FC<LogoProps> = ({ responsive: hide = false }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexGrow: { xs: 0, md: 1 },
      }}
    >
      {/* Logo Icon */}
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.warning.vivid} 0%, ${colors.warning.main} 100%)`,
          boxShadow: `0 2px 8px ${alpha(theme.palette.warning.main, 0.3)}`,
        })}
      >
        <WbSunnyIcon sx={{ color: 'white', fontSize: 24 }} />
      </Box>

      {/* Logo Text */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          // Solid ink, not gradient text: the amber lives in the sun mark, the
          // word carries weight. The old gradient measured 2.15-3.19:1 on white.
          color: colors.text.primary,
          letterSpacing: '-0.5px',
          display: { xs: hide ? 'none' : 'block', md: 'block' },
        }}
      >
        ConLuz
      </Typography>
    </Box>
  );
};
