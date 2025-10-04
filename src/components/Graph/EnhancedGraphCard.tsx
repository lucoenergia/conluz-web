import { Card, CardContent, Typography, Box, IconButton, Tooltip, useMediaQuery, useTheme, ClickAwayListener } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { FC, ReactNode } from "react";
import { useState } from "react";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);

  const handleTooltipToggle = () => {
    if (isMobile) {
      setOpen(!open);
    }
  };

  const handleClickAway = () => {
    if (isMobile) {
      setOpen(false);
    }
  };
  const getHeaderStyles = () => {
    switch (variant) {
      case "production":
        return {
          background: "#667eea",
        };
      case "consumption":
        return {
          background: "#667eea",
        };
      default:
        return {
          background: "#667eea",
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
        <ClickAwayListener onClickAway={handleClickAway}>
          <div>
            <Tooltip
              title={infoText}
              placement="left"
              open={isMobile ? open : undefined}
              disableFocusListener={isMobile}
              disableHoverListener={isMobile}
              disableTouchListener={isMobile}
            >
              <IconButton
                size="small"
                onClick={handleTooltipToggle}
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
          </div>
        </ClickAwayListener>
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