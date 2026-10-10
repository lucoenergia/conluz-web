import { MenuLinkItem, Mui, Icons } from "conluz-web";

export const ProfileLinks = () => (
  <Mui.Paper sx={{ maxWidth: 280, py: 1, "& a": { textDecoration: "none", color: "inherit" } }}>
    <MenuLinkItem to="/profile">
      <Mui.ListItemIcon><Icons.PersonOutline fontSize="small" /></Mui.ListItemIcon>
      <Mui.ListItemText>Mi perfil</Mui.ListItemText>
    </MenuLinkItem>
    <MenuLinkItem to="/change-password" selected>
      <Mui.ListItemIcon><Icons.LockReset fontSize="small" /></Mui.ListItemIcon>
      <Mui.ListItemText>Cambiar contraseña</Mui.ListItemText>
    </MenuLinkItem>
    <MenuLinkItem to="/contact">
      <Mui.ListItemIcon><Icons.SupportAgentRounded fontSize="small" /></Mui.ListItemIcon>
      <Mui.ListItemText>Contacto</Mui.ListItemText>
    </MenuLinkItem>
  </Mui.Paper>
);

export const TextOnly = () => (
  <Mui.Paper sx={{ maxWidth: 280, py: 1, "& a": { textDecoration: "none", color: "inherit" } }}>
    <MenuLinkItem to="/supply-points">Puntos de suministro</MenuLinkItem>
    <MenuLinkItem to="/production">Producción</MenuLinkItem>
  </Mui.Paper>
);
