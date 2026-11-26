import { Fragment, useId, useState, type FC, type ReactNode } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import { colors, fontSizes } from "../../theme/tokens";
import { useListLayout } from "../ResponsiveRecordList/useListLayout";
import { sxStyles } from "../../theme/sx";

export interface ListFilterOption {
  value: string;
  label: string;
  /** Shown indented under the option before it. */
  nested?: boolean;
}

export interface ListFilter {
  key: string;
  /** The select's label from `LIST_TABLE_MIN_WIDTH` up, and the fieldset's legend and chip prefix below it. */
  label: string;
  value: string;
  /** The first option is the filter's "no filter" value: no chip is shown while it is selected. */
  options: ListFilterOption[];
  onChange: (value: string) => void;
  /** The select's width in the wide layout. */
  width: number;
}

export interface ListFiltersProps {
  /** A search field: beside the selects when wide, above the "Filtros" button when narrow. */
  search?: ReactNode;
  filters: ListFilter[];
  /** Whether the bar's "Limpiar filtros" is shown. */
  showClear?: boolean;
  onClear?: () => void;
  /** The narrow panel's close button, naming how many rows match ("Ver 3 miembros"). */
  resultLabel: string;
}

const ClearButton: FC<{ onClear?: () => void }> = ({ onClear }) => (
  <Button variant="text" startIcon={<FilterAltOffIcon />} onClick={onClear} sx={sxStyles.touchTarget}>
    Limpiar filtros
  </Button>
);

const labelOf = (filter: ListFilter) => filter.options.find((option) => option.value === filter.value)?.label ?? "";

/**
 * A list's filters over the rows already loaded (#331): a select per filter
 * from `LIST_TABLE_MIN_WIDTH` up; below it, a "Filtros" button opening a panel
 * of radio groups, with a chip per active filter. Every change applies at
 * once, on every viewport: the narrow panel's button only closes it.
 */
export const ListFilters: FC<ListFiltersProps> = ({ search, filters, showClear = false, onClear, resultLabel }) => {
  const layout = useListLayout();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();

  if (layout === "wide") {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        {search && <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>{search}</Box>}
        {filters.map((filter) => (
          <TextField
            key={filter.key}
            select
            size="small"
            label={filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            sx={{ width: filter.width }}
          >
            {filter.options.map((option) => (
              <MenuItem key={option.value} value={option.value} sx={{ pl: option.nested ? 4 : 2 }}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {showClear && <ClearButton onClear={onClear} />}
      </Box>
    );
  }

  // Search is not a filter here: it stays visible, outside the count and the chips.
  const chips = filters
    .filter((filter) => filter.value !== filter.options[0]?.value)
    .map((filter) => ({
      key: filter.key,
      label: `${filter.label}: ${labelOf(filter)}`,
      clear: () => filter.onChange(filter.options[0].value),
    }));
  const activeCount = chips.length;
  const filtersLabel =
    activeCount === 0 ? "Filtros" : `Filtros, ${activeCount} ${activeCount === 1 ? "activo" : "activos"}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {search}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Button
          variant={activeCount > 0 || panelOpen ? "contained" : "outlined"}
          startIcon={<FilterListIcon />}
          aria-label={filtersLabel}
          aria-expanded={panelOpen}
          aria-controls={panelId}
          onClick={() => setPanelOpen((open) => !open)}
          sx={sxStyles.touchTarget}
        >
          Filtros
          {activeCount > 0 && (
            <Box
              component="span"
              aria-hidden
              sx={{
                ml: 1,
                minWidth: 20,
                height: 20,
                px: 0.5,
                borderRadius: 10,
                bgcolor: colors.background.paper,
                color: "primary.main",
                fontSize: fontSizes.xs,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeCount}
            </Box>
          )}
        </Button>
        {showClear && <ClearButton onClear={onClear} />}
      </Box>

      {chips.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {chips.map((chip) => (
            <Chip key={chip.key} label={chip.label} color="primary" variant="outlined" onDelete={chip.clear} />
          ))}
        </Box>
      )}

      {panelOpen && (
        <Box
          id={panelId}
          sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 1.5, borderTop: `1px solid ${colors.divider}` }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Los filtros se aplican al momento: la lista de abajo ya está filtrada.
          </Typography>
          {filters.map((filter, index) => {
            // A group with nested options lines its top-level ones up at the edge, so the nesting reads.
            const hasNested = filter.options.some((option) => option.nested);
            return (
              <Fragment key={filter.key}>
                {index > 0 && <Divider />}
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontSize: fontSizes.xs, fontWeight: 600 }}>
                    {filter.label}
                  </FormLabel>
                  <RadioGroup value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                    {filter.options.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size="small" />}
                        label={option.label}
                        sx={{ ...(hasNested && { ml: option.nested ? 3 : 0 }), mr: 0, minHeight: 44 }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Fragment>
            );
          })}
          <Button variant="contained" size="large" fullWidth onClick={() => setPanelOpen(false)} sx={{ mt: 1 }}>
            {resultLabel}
          </Button>
        </Box>
      )}
    </Box>
  );
};
