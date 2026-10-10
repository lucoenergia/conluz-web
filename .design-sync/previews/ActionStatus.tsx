import { ActionStatus, Mui, Icons, colors, radii } from "conluz-web";

/**
 * ActionStatus is a visually hidden live region: it paints nothing. Each cell
 * shows the action it follows plus a visible transcript of what a screen reader
 * hears, and mounts the real region alongside.
 */
const Transcript = ({ message }: { message: string }) => (
  <Mui.Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 1.5,
      py: 1,
      borderRadius: radii.small,
      border: "1px dashed",
      borderColor: colors.border.light,
      color: colors.text.subtle,
    }}
  >
    <Icons.InfoOutlined fontSize="small" />
    <Mui.Typography variant="body2">
      {message ? `Lector de pantalla: «${message}»` : "Lector de pantalla: (sin anuncio)"}
    </Mui.Typography>
  </Mui.Box>
);

export const AfterPublish = () => {
  const message = "Reparto publicado";
  return (
    <Mui.Box sx={{ maxWidth: 480, display: "grid", gap: 1.5 }}>
      <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Mui.Typography sx={{ fontWeight: 700 }}>Reparto 2026 · Planta Polideportivo</Mui.Typography>
        <Mui.Chip label="Publicado" color="success" size="small" sx={{ fontWeight: 600 }} />
      </Mui.Box>
      <Transcript message={message} />
      <ActionStatus message={message} />
    </Mui.Box>
  );
};

export const Idle = () => (
  <Mui.Box sx={{ maxWidth: 480, display: "grid", gap: 1.5 }}>
    <Mui.Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Mui.Typography sx={{ fontWeight: 700 }}>Reparto 2026 · Planta Polideportivo</Mui.Typography>
      <Mui.Chip label="Borrador" size="small" sx={{ fontWeight: 600 }} />
    </Mui.Box>
    <Transcript message="" />
    <ActionStatus message="" />
  </Mui.Box>
);
