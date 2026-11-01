import type { FC } from "react";
import { Box, Chip } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { colors } from "../../theme/tokens";

export type FilterStatus = "all" | "active" | "inactive";

export interface FilterChipsBarProps {
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
  showIcon?: boolean;
}

/**
 * The status filter of a list. A selected chip is the brand colour whichever
 * it is: success and error colours are kept for outcomes, and a status filter
 * reports none (UI-SUP-013).
 */
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
        <FilterListIcon sx={{ color: colors.text.secondary, display: { xs: "none", sm: "block" } }} />
      )}
      <Chip
        label="Todos"
        onClick={() => onChange("all")}
        color={value === "all" ? "primary" : "default"}
        size="small"
      />
      <Chip
        label="Activos"
        onClick={() => onChange("active")}
        color={value === "active" ? "primary" : "default"}
        size="small"
      />
      <Chip
        label="Dados de baja"
        onClick={() => onChange("inactive")}
        color={value === "inactive" ? "primary" : "default"}
        size="small"
      />
    </Box>
  );
};
