import { Card, CardContent, Typography, Box, IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { FC, ReactNode } from "react";

interface EnhancedGraphCardProps {
  title: string;
  subtitle?: string;
  infoText: string;
  children: ReactNode;
  className?: string;
  variant?: "production" | "consumption" | "default";
}

export const EnhancedGraphCard: FC<EnhancedGraphCardProps> = ({
  title,
  subtitle,
  infoText,
  children,
  className,
  variant = "default"
}) => {
  const getHeaderStyles = () => {
    switch (variant) {
      case "production":
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        };
      case "consumption":
        return {
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        };
      default:
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        };
    }
  };

  const headerStyles = getHeaderStyles();

  return (
    <Card
      className={className}
      sx={{
        width: "100%",
        borderRadius: 2,
        transition: "all 0.3s ease",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.12)",
        overflow: "hidden",
        "&:hover": {
          boxShadow: "0 6px 24px 0 rgba(0,0,0,0.15)",
        },
      }}
    >
      <Box
        sx={{
          ...headerStyles,
          color: "white",
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Tooltip title={infoText} placement="left">
          <IconButton
            size="small"
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.3)",
              },
            }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <CardContent
        sx={{
          p: { xs: 2, sm: 3 },
          minHeight: { xs: 250, sm: 300 },
          "& > div": {
            height: "100%",
          },
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};