import { useState } from "react";
import { ListFilters, SearchBar } from "conluz-web";

// Below LIST_TABLE_MIN_WIDTH the same filters render as a "Filtros" button and a panel of radios.

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
  { value: "pending", label: "Pendiente" },
  { value: "invitationSent", label: "Invitación enviada", nested: true },
  { value: "noEmail", label: "Sin email", nested: true },
];

const ROLE_OPTIONS = [
  { value: "all", label: "Todos los roles" },
  { value: "COMMUNITY_ADMIN", label: "Administrador" },
  { value: "COMMUNITY_MEMBER", label: "Miembro" },
];

export const WithSearch = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  return (
    <ListFilters
      search={
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar por nombre, DNI/NIE/NIF o email" label="Buscar miembros" />
      }
      filters={[
        { key: "status", label: "Estado", value: status, options: STATUS_OPTIONS, onChange: setStatus, width: 280 },
        { key: "role", label: "Rol", value: role, options: ROLE_OPTIONS, onChange: setRole, width: 200 },
      ]}
      resultLabel="Ver 12 miembros"
    />
  );
};

export const Active = () => {
  const [status, setStatus] = useState("pending");
  return (
    <ListFilters
      filters={[{ key: "status", label: "Estado", value: status, options: STATUS_OPTIONS, onChange: setStatus, width: 280 }]}
      showClear
      onClear={() => setStatus("all")}
      resultLabel="Ver 3 miembros"
    />
  );
};

export const WithCounts = () => {
  const [status, setStatus] = useState("all");
  return (
    <ListFilters
      filters={[
        {
          key: "status",
          label: "Estado",
          value: status,
          options: [
            { value: "all", label: "Todos (14)" },
            { value: "warnings", label: "Con avisos (4)" },
            { value: "APPLIED_SAME_DATE", label: "Aplicado · misma fecha (9)" },
            { value: "NOT_DISTINGUISHABLE", label: "No distinguible (3)" },
            { value: "NOT_OBSERVABLE", label: "No observable · punto de la planta (1)" },
          ],
          onChange: setStatus,
          width: 320,
        },
      ]}
      resultLabel="Ver 14 puntos"
    />
  );
};
