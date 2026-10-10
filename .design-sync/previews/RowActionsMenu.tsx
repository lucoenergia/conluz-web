import { useState } from "react";
import { RowActionsMenu, Mui, Icons } from "conluz-web";

export const OpenOnARow = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <Mui.Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-start", pr: 4, pt: 4, minHeight: 240 }}>
      <Mui.IconButton ref={setAnchor} aria-label="Más acciones para Lucía Ferrer" onClick={(e) => setAnchor(e.currentTarget)}>
        <Icons.MoreVert />
      </Mui.IconButton>
      <RowActionsMenu anchorEl={anchor} onClose={() => setAnchor(null)}>
        <Mui.MenuItem>
          <Mui.ListItemIcon><Icons.EditOutlined fontSize="small" /></Mui.ListItemIcon>
          <Mui.ListItemText>Editar</Mui.ListItemText>
        </Mui.MenuItem>
        <Mui.MenuItem>
          <Mui.ListItemIcon><Icons.Block fontSize="small" /></Mui.ListItemIcon>
          <Mui.ListItemText>Desactivar</Mui.ListItemText>
        </Mui.MenuItem>
        <Mui.Divider />
        <Mui.MenuItem sx={{ color: "error.main" }}>
          <Mui.ListItemIcon sx={{ color: "error.main" }}><Icons.DeleteOutline fontSize="small" /></Mui.ListItemIcon>
          <Mui.ListItemText>Eliminar</Mui.ListItemText>
        </Mui.MenuItem>
      </RowActionsMenu>
    </Mui.Box>
  );
};
