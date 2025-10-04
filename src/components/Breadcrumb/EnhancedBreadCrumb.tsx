import * as React from "react";
import { Breadcrumbs, Link, Typography, Box, Chip } from "@mui/material";
import { Link as RouterLink } from "react-router";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HomeIcon from "@mui/icons-material/Home";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface BreadCrumbStep {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface EnhancedBreadCrumbProps {
  steps: BreadCrumbStep[];
  className?: string;
}

export const EnhancedBreadCrumb: React.FC<EnhancedBreadCrumbProps> = ({ steps, className }) => {
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
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        borderRadius: 2,
        boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
        width: "100%",
        overflow: "auto",
      }}
    >
      <Breadcrumbs
        separator={
          <NavigateNextIcon
            fontSize="small"
            sx={{ color: "#94a3b8" }}
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
                        color: "#fff",
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Box>
                }
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                color: "#475569",
                textDecoration: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  color: "#667eea",
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