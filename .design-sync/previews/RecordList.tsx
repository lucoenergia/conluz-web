import { RecordList, Mui, fontSizes } from "conluz-web";

const noop = () => {};
const rowActions = { label: (item: { title: string }) => `Más acciones para ${item.title}`, onClick: noop };

const member = (id: string, name: string, email: string, role: string, enabled: boolean) => ({
  id,
  avatar: (
    <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
      {name.charAt(0)}
    </Mui.Avatar>
  ),
  title: name,
  status: (
    <Mui.Chip label={enabled ? "Activo" : "Inactivo"} color={enabled ? "success" : "error"} size="small" sx={{ fontWeight: 600 }} />
  ),
  fields: [
    { label: "Email", value: email },
    { label: "Rol", value: role },
  ],
});

const items = [
  member("m-1", "Lucía Ferrer Puig", "lucia.ferrer@correo.es", "Administradora", true),
  member("m-2", "Joan Martínez Soler", "joan.martinez@correo.es", "Miembro", true),
  member("m-3", "Carmen Navarro Gil", "carmen.navarro@correo.es", "Miembro", false),
];

export const Members = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList label="Miembros de la comunidad" items={items} rowActions={rowActions} />
  </Mui.Box>
);

export const WithBadge = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList
      label="Usuarios de la plataforma"
     
      rowActions={rowActions}
      items={[
        {
          ...member("u-1", "Vicent Ribes Climent", "vicent.ribes@correo.es", "Miembro", true),
          badge: <Mui.Chip label="Administrador de plataforma" size="small" variant="outlined" color="primary" />,
        },
      ]}
    />
  </Mui.Box>
);

export const WithLines = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList
      label="Miembros de la comunidad"
     
      rowActions={{ ...rowActions, has: (item) => item.id === "m-4" }}
      items={[
        {
          id: "m-4",
          avatar: (
            <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>A</Mui.Avatar>
          ),
          title: "Amparo Domínguez Llorens",
          badge: <Mui.Chip label="Invitación enviada" size="small" sx={{ fontWeight: 600 }} />,
          lines: ["Miembro · 12345678Z", "amparo.dominguez.llorens.cooperativa@telefonica.net"],
          fields: [],
        },
        {
          id: "m-5",
          avatar: (
            <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>T</Mui.Avatar>
          ),
          title: "Toni Esteve Cano",
          badge: <Mui.Chip label="Sin email" size="small" sx={{ fontWeight: 600 }} />,
          lines: ["Administrador · X1234567L"],
          fields: [],
        },
      ]}
    />
  </Mui.Box>
);

export const Loading = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList label="Miembros de la comunidad" items={[]} isLoading />
  </Mui.Box>
);

export const WithSelection = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList
      label="Miembros de la comunidad"
     
      rowActions={rowActions}
      items={items.map((item, index) => ({
        ...item,
        selection:
          index < 2 ? (
            <Mui.Checkbox checked={index === 0} inputProps={{ "aria-label": `Seleccionar ${item.title}` }} />
          ) : undefined,
      }))}
    />
  </Mui.Box>
);

export const WithLinks = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList
      label="Puntos de suministro"
      chevron
      items={[
        { id: "s-1", title: "Casa de Lucía", href: "/supply-points/s-1", lines: ["ES0021000000000001AB"] },
        { id: "s-2", title: "Local de la cooperativa", href: "/supply-points/s-2", lines: ["ES0021000000000002CD"] },
        { id: "s-3", title: "Nave antigua", href: "/supply-points/s-3", lines: ["ES0021000000000003EF"], inactive: true },
      ]}
    />
  </Mui.Box>
);
