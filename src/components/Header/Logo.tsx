import { Box, Typography } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import type { FC } from "react";

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
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 100%)',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
        }}
      >
        <WbSunnyIcon sx={{ color: 'white', fontSize: 24 }} />
      </Box>

      {/* Logo Text */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px',
          display: { xs: hide ? 'none' : 'block', md: 'block' },
        }}
      >
        ConLuz
      </Typography>
    </Box>
  );
};
