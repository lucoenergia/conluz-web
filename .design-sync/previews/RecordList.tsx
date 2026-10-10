import { RecordList, Mui, Icons, fontSizes, sxStyles } from "conluz-web";

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
  actions: (
    <Mui.IconButton aria-label={`Más acciones para ${name}`} sx={sxStyles.touchTarget}>
      <Icons.MoreVert />
    </Mui.IconButton>
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
    <RecordList label="Miembros de la comunidad" emptyMessage="No se encontraron miembros" items={items} />
  </Mui.Box>
);

export const WithBadge = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList
      label="Usuarios de la plataforma"
      emptyMessage="No se encontraron usuarios"
      items={[
        {
          ...member("u-1", "Vicent Ribes Climent", "vicent.ribes@correo.es", "Miembro", true),
          badge: <Mui.Chip label="Administrador de plataforma" size="small" variant="outlined" color="primary" />,
        },
      ]}
    />
  </Mui.Box>
);

export const Loading = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList label="Miembros de la comunidad" emptyMessage="No se encontraron miembros" items={[]} isLoading />
  </Mui.Box>
);

export const Empty = () => (
  <Mui.Box sx={{ maxWidth: 390 }}>
    <RecordList label="Miembros de la comunidad" emptyMessage="No se encontraron miembros" items={[]} />
  </Mui.Box>
);
