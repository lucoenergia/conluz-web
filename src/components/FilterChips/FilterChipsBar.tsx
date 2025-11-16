import type { FC } from "react";
import { Box, Chip } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";

export type FilterStatus = "all" | "active" | "inactive";

export interface FilterChipsBarProps {
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
  showIcon?: boolean;
}

export const FilterChipsBar: FC<FilterChipsBarProps> = ({
  value,
  onChange,
  showIcon = true,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: { xs: "center", sm: "flex-start" },
      }}
    >
      {showIcon && (
        <FilterListIcon sx={{ color: "#64748b", display: { xs: "none", sm: "block" } }} />
      )}
      <Chip
        label="Todos"
        onClick={() => onChange("all")}
        color={value === "all" ? "primary" : "default"}
        size="small"
        sx={{
          background: value === "all" ? "#667eea" : undefined,
        }}
      />
      <Chip
        label="Activos"
        onClick={() => onChange("active")}
        color={value === "active" ? "success" : "default"}
        size="small"
      />
      <Chip
        label="Inactivos"
        onClick={() => onChange("inactive")}
        color={value === "inactive" ? "error" : "default"}
        size="small"
      />
    </Box>
  );
};
