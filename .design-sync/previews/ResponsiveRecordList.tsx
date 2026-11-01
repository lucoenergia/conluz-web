import { ResponsiveRecordList, RecordList, ListTable, ListPagination, EmptyState, Mui, Icons, fontSizes } from "conluz-web";

type Member = { id: string; name: string; email: string; role: string };

const members: Member[] = [
  { id: "1", name: "Lucía Ferrer Puig", email: "lucia.ferrer@correo.es", role: "Administradora" },
  { id: "2", name: "Joan Martínez Soler", email: "joan.martinez@correo.es", role: "Miembro" },
  { id: "3", name: "Carmen Navarro Gil", email: "carmen.navarro@correo.es", role: "Miembro" },
];

const avatar = (name: string) => (
  <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>{name.charAt(0)}</Mui.Avatar>
);
const noop = () => {};

const wide = (
  <ListTable
    rows={members}
    getRowKey={(m) => m.id}
    isLoading={false}
    title={{ header: "Miembro", text: (m) => m.name, leading: (m) => avatar(m.name), secondary: (m) => [m.email] }}
    columns={[{ key: "role", header: "Rol", render: (m) => m.role }]}
    rowActions={{ label: (m) => `Más acciones para ${m.name}`, onClick: noop }}
  />
);

const narrow = (
  <RecordList
    label="Miembros de la comunidad"
    items={members.map((m) => ({ id: m.id, title: m.name, avatar: avatar(m.name), lines: [m.role, m.email] }))}
    rowActions={{ label: (item) => `Más acciones para ${item.title}`, onClick: noop }}
  />
);

export const Members = () => (
  <ResponsiveRecordList
    narrow={narrow}
    wide={wide}
    footer={
      <ListPagination page={1} pageCount={3} total={63} noun={{ one: "miembro", other: "miembros" }} onChange={noop} />
    }
  />
);

export const Empty = () => (
  <ResponsiveRecordList
    narrow={narrow}
    wide={wide}
    empty={<EmptyState icon={Icons.People} title="No hay miembros en esta comunidad" />}
  />
);

export const LoadFailed = () => (
  <ResponsiveRecordList
    narrow={narrow}
    wide={wide}
    error={{ message: "No se pudieron cargar los miembros.", onRetry: noop }}
  />
);
