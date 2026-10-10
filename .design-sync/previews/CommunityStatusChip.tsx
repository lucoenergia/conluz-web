import { CommunityStatusChip, Mui } from "conluz-web";

export const Activa = () => <CommunityStatusChip status="Activa" />;

export const SinAdmin = () => <CommunityStatusChip status="Sin admin" />;

export const SinUsuarios = () => <CommunityStatusChip status="Sin usuarios" />;

export const Deshabilitada = () => <CommunityStatusChip status="Deshabilitada" />;

export const AllStatuses = () => (
  <Mui.Stack spacing={1.5}>
    {([
      ["Comunidad Energética de Torrent", "Activa"],
      ["Sol de Benimaclet", "Sin admin"],
      ["Coop. Solar de Alzira", "Sin usuarios"],
      ["Renovables de Xàtiva", "Deshabilitada"],
    ] as const).map(([name, status]) => (
      <Mui.Box key={name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, minWidth: 340 }}>
        <Mui.Typography variant="body2" sx={{ fontWeight: 600 }}>{name}</Mui.Typography>
        <CommunityStatusChip status={status} />
      </Mui.Box>
    ))}
  </Mui.Stack>
);
