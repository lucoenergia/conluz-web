import { useEffect, useRef, useState } from "react";
import { MenuTemplate, Mui, Icons, colors } from "conluz-web";

export const ProfileMenuOpen = () => {
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Open after layout settles so the popover measures the anchor's final position.
    const t = setTimeout(() => setAnchor(ref.current), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <Mui.Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", pr: 4, pt: 2, minHeight: 300 }}>
      <Mui.IconButton ref={ref} aria-label="Abrir menú de usuario" onClick={(e) => setAnchor(e.currentTarget)}>
        <Mui.Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>L</Mui.Avatar>
      </Mui.IconButton>
      <MenuTemplate anchorElement={anchor} onClose={() => setAnchor(null)}>
        <Mui.Box sx={{ px: 2.5, py: 2, bgcolor: colors.background.surface }}>
          <Mui.Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Lucía Ferrer</Mui.Typography>
          <Mui.Typography variant="caption" sx={{ color: colors.text.subtle }}>lucia.ferrer@example.org</Mui.Typography>
        </Mui.Box>
        <Mui.Divider />
        <Mui.Box sx={{ py: 1 }}>
          <Mui.MenuItem>
            <Mui.ListItemIcon><Icons.PersonOutline fontSize="small" /></Mui.ListItemIcon>
            <Mui.ListItemText>Mi perfil</Mui.ListItemText>
          </Mui.MenuItem>
          <Mui.MenuItem>
            <Mui.ListItemIcon><Icons.LockReset fontSize="small" /></Mui.ListItemIcon>
            <Mui.ListItemText>Cambiar contraseña</Mui.ListItemText>
          </Mui.MenuItem>
          <Mui.Divider sx={{ my: 1 }} />
          <Mui.MenuItem sx={{ color: "error.main" }}>
            <Mui.ListItemIcon sx={{ color: "error.main" }}><Icons.Logout fontSize="small" /></Mui.ListItemIcon>
            <Mui.ListItemText>Cerrar sesión</Mui.ListItemText>
          </Mui.MenuItem>
        </Mui.Box>
      </MenuTemplate>
    </Mui.Box>
  );
};
