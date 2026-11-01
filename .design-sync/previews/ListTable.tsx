import { ListTable, RowActionsMenu, Mui, fontSizes } from "conluz-web";

type Member = { id: string; name: string; email: string; role: string; enabled: boolean };

const members: Member[] = [
  { id: "1", name: "Lucía Ferrer", email: "lucia.ferrer@example.org", role: "Administración", enabled: true },
  { id: "2", name: "Andrés Molina", email: "andres.molina@example.org", role: "Miembro", enabled: true },
  { id: "3", name: "Carmen Ruiz", email: "carmen.ruiz@example.org", role: "Miembro", enabled: false },
];

const title = {
  header: "Miembro",
  text: (m: Member) => m.name,
  leading: (m: Member) => (
    <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
      {m.name.charAt(0)}
    </Mui.Avatar>
  ),
  secondary: (m: Member) => [m.email],
};

const columns = [
  { key: "role", header: "Rol", render: (m: Member) => <Mui.Typography variant="body2">{m.role}</Mui.Typography> },
  {
    key: "status",
    header: "Estado",
    render: (m: Member) => (
      <Mui.Chip
        label={m.enabled ? "Activo" : "Inactivo"}
        color={m.enabled ? "success" : "error"}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    ),
  },
];

const noop = () => {};

export const Members = () => (
  <ListTable
    rows={members}
    getRowKey={(m) => m.id}
    title={title}
    columns={columns}
    isLoading={false}
    emptyMessage="No hay miembros en esta comunidad"
    rowActions={{ label: (m) => `Más acciones para ${m.name}`, onClick: noop }}
  />
);

export const Loading = () => (
  <ListTable
    rows={[] as Member[]}
    getRowKey={(m) => m.id}
    title={title}
    columns={columns}
    isLoading
    emptyMessage="No hay miembros en esta comunidad"
    rowActions={{ label: (m) => `Más acciones para ${m.name}`, onClick: noop }}
  />
);

export const Empty = () => (
  <ListTable
    rows={[] as Member[]}
    getRowKey={(m) => m.id}
    title={title}
    columns={columns}
    isLoading={false}
    emptyMessage="No hay miembros en esta comunidad"
    rowActions={{ label: (m) => `Más acciones para ${m.name}`, onClick: noop }}
  />
);

const selectable = (m: Member) => m.enabled;
const selected = new Set(["1"]);

export const WithSelection = () => (
  <ListTable
    rows={members}
    getRowKey={(m) => m.id}
    title={title}
    columns={columns}
    isLoading={false}
    emptyMessage="No hay miembros en esta comunidad"
    rowActions={{ label: (m) => `Más acciones para ${m.name}`, onClick: noop }}
    selection={{
      header: <Mui.Checkbox indeterminate inputProps={{ "aria-label": "Seleccionar todo" }} />,
      render: (m) =>
        selectable(m) ? (
          <Mui.Checkbox checked={selected.has(m.id)} inputProps={{ "aria-label": `Seleccionar ${m.name}` }} />
        ) : null,
    }}
  />
);
