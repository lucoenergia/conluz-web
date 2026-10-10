import { ListTable, RowActionsMenu, Mui, colors, fontSizes } from "conluz-web";

type Member = { id: string; name: string; email: string; role: string; enabled: boolean };

const members: Member[] = [
  { id: "1", name: "Lucía Ferrer", email: "lucia.ferrer@example.org", role: "Administración", enabled: true },
  { id: "2", name: "Andrés Molina", email: "andres.molina@example.org", role: "Miembro", enabled: true },
  { id: "3", name: "Carmen Ruiz", email: "carmen.ruiz@example.org", role: "Miembro", enabled: false },
];

const columns = [
  {
    key: "member",
    header: "Miembro",
    render: (m: Member) => (
      <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
          {m.name.charAt(0)}
        </Mui.Avatar>
        <Mui.Box>
          <Mui.Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name}</Mui.Typography>
          <Mui.Typography variant="caption" sx={{ color: colors.text.subtle }}>{m.email}</Mui.Typography>
        </Mui.Box>
      </Mui.Box>
    ),
  },
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
    columns={columns}
    isLoading={false}
    emptyMessage="No hay miembros en esta comunidad"
    rowActionsLabel={(m) => `Más acciones para ${m.name}`}
    onRowActionsClick={noop}
  />
);

export const Loading = () => (
  <ListTable
    rows={[] as Member[]}
    getRowKey={(m) => m.id}
    columns={columns}
    isLoading
    emptyMessage="No hay miembros en esta comunidad"
    rowActionsLabel={(m) => `Más acciones para ${m.name}`}
    onRowActionsClick={noop}
  />
);

export const Empty = () => (
  <ListTable
    rows={[] as Member[]}
    getRowKey={(m) => m.id}
    columns={columns}
    isLoading={false}
    emptyMessage="No hay miembros en esta comunidad"
    rowActionsLabel={(m) => `Más acciones para ${m.name}`}
    onRowActionsClick={noop}
  />
);
