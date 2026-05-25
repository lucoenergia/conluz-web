import * as React from "react";
import { Breadcrumbs, Link, Typography, Box, Chip } from "@mui/material";
import { Link as RouterLink } from "react-router";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { radii, shadows, colors } from "../../theme/tokens";

interface BreadCrumbStep {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface BreadCrumbProps {
  steps: BreadCrumbStep[];
  className?: string;
}

export const BreadCrumb: React.FC<BreadCrumbProps> = ({ steps, className }) => {
  const getIcon = (index: number, step: BreadCrumbStep) => {
    if (step.icon) return step.icon;
    if (index === 0) return <HomeIcon sx={{ fontSize: 20, mr: 0.5 }} />;
    return <LocationOnIcon sx={{ fontSize: 20, mr: 0.5 }} />;
  };

  return (
    <Box
      className={className}
      sx={{
        p: { xs: 1.5, sm: 2 },
        bgcolor: "background.paper",
        borderRadius: radii.default,
        boxShadow: shadows.breadcrumb,
        overflow: "auto",
      }}
    >
      <Breadcrumbs
        separator={
          <NavigateNextIcon
            fontSize="small"
            sx={{ color: colors.text.placeholder }}
          />
        }
        aria-label="breadcrumbs"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          if (isLast) {
            return (
              <Chip
                key={step.label}
                label={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {getIcon(index, step)}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "white",
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Box>
                }
                sx={{
                  background: (theme) => theme.palette.primary.main,
                  color: "white",
                  height: 28,
                  "& .MuiChip-label": {
                    px: 2,
                  },
                }}
              />
            );
          }

          return (
            <Link
              key={step.label}
              component={RouterLink}
              to={step.href}
              sx={{
                display: "flex",
                alignItems: "center",
                color: "secondary.main",
                textDecoration: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  color: "primary.main",
                  transform: "translateX(2px)",
                },
              }}
            >
              {getIcon(index, step)}
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {step.label}
              </Typography>
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};