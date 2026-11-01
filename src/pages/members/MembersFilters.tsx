import { useId, useState, type FC } from "react";
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
import { MembershipResponseRole } from "../../api/models";
import { SearchBar } from "../../components/SearchBar";
import { colors, fontSizes } from "../../theme/tokens";
import { useListLayout } from "../../components/ResponsiveRecordList/useListLayout";
import { sxStyles } from "../../theme/sx";
import { STATUS_LABELS } from "./membershipStatus";
import { membersCount, type MemberFilters, type RoleFilter, type StatusFilter } from "./memberFilters";

/** The status options, the four pending sub-statuses grouped under "Pendiente" (#331). */
const STATUS_OPTIONS: { value: StatusFilter; label: string; nested: boolean }[] = [
  { value: "all", label: "Todos los estados", nested: false },
  { value: "active", label: STATUS_LABELS.active, nested: false },
  { value: "suspended", label: STATUS_LABELS.suspended, nested: false },
  { value: "pending", label: STATUS_LABELS.pending, nested: false },
  { value: "invitationSent", label: STATUS_LABELS.invitationSent, nested: true },
  { value: "noEmail", label: STATUS_LABELS.noEmail, nested: true },
  { value: "notInvited", label: STATUS_LABELS.notInvited, nested: true },
  { value: "invitationLapsed", label: STATUS_LABELS.invitationLapsed, nested: true },
];

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Todos los roles" },
  { value: MembershipResponseRole.COMMUNITY_ADMIN, label: "Administrador" },
  { value: MembershipResponseRole.COMMUNITY_MEMBER, label: "Miembro" },
];

const SEARCH_PLACEHOLDER = "Buscar por nombre, DNI/NIE/NIF o email";

const labelOf = <T,>(options: { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? "";

interface MembersFiltersProps {
  filters: MemberFilters;
  onChange: (changes: Partial<MemberFilters>) => void;
  onClear: () => void;
  /** How many rows match, for the panel's close button. */
  resultCount: number;
  /** Whether the filter-bar "Limpiar filtros" is shown: something is active and some row matches. */
  showClear: boolean;
}

const ClearButton: FC<{ onClear: () => void }> = ({ onClear }) => (
  <Button variant="text" startIcon={<FilterAltOffIcon />} onClick={onClear} sx={sxStyles.touchTarget}>
    Limpiar filtros
  </Button>
);

/**
 * Search, status and role over the roster already loaded (#331). Every change
 * applies at once, on every viewport: the narrow panel's button only closes it.
 */
export const MembersFilters: FC<MembersFiltersProps> = ({
  filters,
  onChange,
  onClear,
  resultCount,
  showClear,
}) => {
  const layout = useListLayout();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelId = useId();

  const search = (
    <SearchBar
      value={filters.query}
      onChange={(query) => onChange({ query })}
      placeholder={SEARCH_PLACEHOLDER}
      label="Buscar miembros"
    />
  );

  if (layout === "wide") {
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>{search}</Box>
        <TextField
          select
          size="small"
          label="Estado"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value as StatusFilter })}
          sx={{ width: 280 }}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value} sx={{ pl: option.nested ? 4 : 2 }}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Rol"
          value={filters.role}
          onChange={(event) => onChange({ role: event.target.value as RoleFilter })}
          sx={{ width: 200 }}
        >
          {ROLE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {showClear && <ClearButton onClear={onClear} />}
      </Box>
    );
  }

  // Search is not a filter here: it stays visible, outside the count and the chips.
  const chips = [
    ...(filters.status !== "all"
      ? [{ key: "status", label: `Estado: ${labelOf(STATUS_OPTIONS, filters.status)}`, clear: { status: "all" as const } }]
      : []),
    ...(filters.role !== "all"
      ? [{ key: "role", label: `Rol: ${labelOf(ROLE_OPTIONS, filters.role)}`, clear: { role: "all" as const } }]
      : []),
  ];
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
            <Chip
              key={chip.key}
              label={chip.label}
              color="primary"
              variant="outlined"
              onDelete={() => onChange(chip.clear)}
            />
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
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: fontSizes.xs, fontWeight: 600 }}>
              Estado
            </FormLabel>
            <RadioGroup
              value={filters.status}
              onChange={(event) => onChange({ status: event.target.value as StatusFilter })}
            >
              {STATUS_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" />}
                  label={option.label}
                  sx={{ ml: option.nested ? 3 : 0, mr: 0, minHeight: 44 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          <Divider />
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: fontSizes.xs, fontWeight: 600 }}>
              Rol
            </FormLabel>
            <RadioGroup value={filters.role} onChange={(event) => onChange({ role: event.target.value as RoleFilter })}>
              {ROLE_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size="small" />}
                  label={option.label}
                  sx={{ mr: 0, minHeight: 44 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
          <Button variant="contained" size="large" fullWidth onClick={() => setPanelOpen(false)} sx={{ mt: 1 }}>
            Ver {membersCount(resultCount)}
          </Button>
        </Box>
      )}
    </Box>
  );
};
