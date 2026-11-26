import type { FC } from "react";
import { MembershipResponseRole } from "../../api/models";
import { ListFilters } from "../../components/ListFilters";
import { SearchBar } from "../../components/SearchBar";
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

interface MembersFiltersProps {
  filters: MemberFilters;
  onChange: (changes: Partial<MemberFilters>) => void;
  onClear: () => void;
  /** How many rows match, for the panel's close button. */
  resultCount: number;
  /** Whether the filter-bar "Limpiar filtros" is shown: something is active and some row matches. */
  showClear: boolean;
}

/** Search, status and role over the roster already loaded (#331). */
export const MembersFilters: FC<MembersFiltersProps> = ({ filters, onChange, onClear, resultCount, showClear }) => (
  <ListFilters
    search={
      <SearchBar
        value={filters.query}
        onChange={(query) => onChange({ query })}
        placeholder={SEARCH_PLACEHOLDER}
        label="Buscar miembros"
      />
    }
    filters={[
      {
        key: "status",
        label: "Estado",
        value: filters.status,
        options: STATUS_OPTIONS,
        onChange: (status) => onChange({ status: status as StatusFilter }),
        width: 280,
      },
      {
        key: "role",
        label: "Rol",
        value: filters.role,
        options: ROLE_OPTIONS,
        onChange: (role) => onChange({ role: role as RoleFilter }),
        width: 200,
      },
    ]}
    showClear={showClear}
    onClear={onClear}
    resultLabel={`Ver ${membersCount(resultCount)}`}
  />
);
