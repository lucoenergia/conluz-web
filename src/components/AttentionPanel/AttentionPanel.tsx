import type { FC, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link } from "react-router";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { alphas, colors, radii } from "../../theme/tokens";

export interface AttentionItem {
  /** Stable key for the row. */
  key: string;
  /** Leading icon for the signal. */
  icon: ReactNode;
  /** Full Spanish label, e.g. "2 comunidades sin administrador". */
  label: string;
  /** Route the "Revisar" link points to. */
  to: string;
}

export interface AttentionPanelProps {
  /** Non-zero signals only — the caller filters out zero-count rows. */
  items: AttentionItem[];
}

/**
 * Warning-tinted panel listing communities that need attention. Renders nothing
 * when there are no items (all signals at zero).
 */
export const AttentionPanel: FC<AttentionPanelProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        bgcolor: alphas.warning.light,
        borderRadius: radii.large,
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <WarningAmberRoundedIcon sx={{ color: "warning.main" }} />
        <Typography sx={{ fontWeight: 600, color: colors.text.primary }}>
          Requiere atención
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {items.map((item) => (
          <Box
            key={item.key}
            sx={{
              bgcolor: "white",
              borderRadius: radii.default,
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ display: "flex", color: "warning.main" }}>{item.icon}</Box>
              <Typography variant="body2" sx={{ color: colors.text.body }}>
                {item.label}
              </Typography>
            </Box>
            <Button
              component={Link}
              to={item.to}
              variant="text"
              size="small"
              endIcon={<ChevronRightRoundedIcon />}
              sx={{ color: "primary.main", flexShrink: 0 }}
            >
              Revisar
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
