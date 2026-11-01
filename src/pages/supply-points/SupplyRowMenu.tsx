import type { FC } from "react";
import { Link } from "react-router";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { RowActionsMenu } from "../../components/ListTable";
import type { SupplyResponse } from "../../api/models";
import type { SupplyRowActions } from "../../hooks/actions/useSupplyActions";
import { supplyHref } from "./supplyRows";

export interface SupplyRowMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** The supply whose kebab opened the menu, resolved from the current read. */
  supply: SupplyResponse | undefined;
  /** That supply's actions, from `forSupply`. An action it was not given is undefined, and its item is not offered. */
  actions: SupplyRowActions["actions"];
  onDisable: () => void;
  onEnable: () => void;
  onDelete: () => void;
}

/**
 * The supply list's row menu (UI-SUP-001). Each item is the supply's own
 * answer; the supply's state picks between "Deshabilitar" and "Activar".
 * Deleting is destructive, so it goes last, below a divider, in the error colour.
 */
export const SupplyRowMenu: FC<SupplyRowMenuProps> = ({
  anchorEl,
  onClose,
  supply,
  actions,
  onDisable,
  onEnable,
  onDelete,
}) => {
  const disable = supply?.enabled ? actions.disable : undefined;
  const enable = supply && !supply.enabled ? actions.enable : undefined;
  const select = (choose: () => void) => () => {
    onClose();
    choose();
  };

  return (
    <RowActionsMenu anchorEl={supply ? anchorEl : null} onClose={onClose}>
      {supply && (
        <MenuItem component={Link} to={supplyHref(supply)} onClick={onClose}>
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          <ListItemText>Ver</ListItemText>
        </MenuItem>
      )}
      {supply && actions.edit && (
        <MenuItem component={Link} to={`${supplyHref(supply)}/edit`} onClick={onClose}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
      )}
      {(disable || enable || actions.remove) && <Divider />}
      {disable && (
        <MenuItem onClick={select(onDisable)}>
          <ListItemIcon>
            <BlockOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Deshabilitar</ListItemText>
        </MenuItem>
      )}
      {enable && (
        <MenuItem onClick={select(onEnable)}>
          <ListItemIcon>
            <CheckCircleOutlineIcon fontSize="small" sx={{ color: "success.main" }} />
          </ListItemIcon>
          <ListItemText sx={{ color: "success.main" }}>Activar</ListItemText>
        </MenuItem>
      )}
      {actions.remove && (
        <MenuItem onClick={select(onDelete)}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          <ListItemText sx={{ color: "error.main" }}>Eliminar punto de suministro</ListItemText>
        </MenuItem>
      )}
    </RowActionsMenu>
  );
};
