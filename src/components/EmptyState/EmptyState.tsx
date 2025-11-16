import type { FC, ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

export interface EmptyStateProps {
  icon: SvgIconComponent;
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    startIcon?: ReactNode;
  };
  iconSize?: number;
  iconColor?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  subtitle,
  actionButton,
  iconSize = 64,
  iconColor = "#94a3b8",
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: "center",
        borderRadius: 3,
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
        width: "100%",
      }}
    >
      <Icon sx={{ fontSize: iconSize, color: iconColor, mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
      {actionButton && (
        <Button
          variant="contained"
          startIcon={actionButton.startIcon}
          onClick={actionButton.onClick}
          sx={{
            mt: 3,
            background: "#667eea",
            borderRadius: 2,
            textTransform: "none",
          }}
        >
          {actionButton.label}
        </Button>
      )}
    </Paper>
  );
};
