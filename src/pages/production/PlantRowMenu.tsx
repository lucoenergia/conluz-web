import type { FC } from "react";
import { Link } from "react-router";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { RowActionsMenu } from "../../components/ListTable";
import type { PlantResponse } from "../../api/models";
import type { PlantRowActions } from "../../hooks/actions/usePlantActions";
import { plantHref } from "./plantRows";

export interface PlantRowMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** The plant whose kebab opened the menu, resolved from the current read. */
  plant: PlantResponse | undefined;
  /** That plant's actions, from `forPlant`. An action it was not given is undefined, and its item is not offered. */
  actions: PlantRowActions["actions"];
  onDelete: () => void;
}

/**
 * The plant list's row menu. Each item is the plant's own answer. Deleting is
 * destructive, so it goes last, below a divider, in the error colour.
 */
export const PlantRowMenu: FC<PlantRowMenuProps> = ({ anchorEl, onClose, plant, actions, onDelete }) => (
  <RowActionsMenu anchorEl={plant ? anchorEl : null} onClose={onClose}>
    {plant && (
      <MenuItem component={Link} to={plantHref(plant)} onClick={onClose}>
        <ListItemIcon>
          <VisibilityOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
        </ListItemIcon>
        <ListItemText>Ver</ListItemText>
      </MenuItem>
    )}
    {plant && actions.edit && (
      <MenuItem component={Link} to={`${plantHref(plant)}/edit`} onClick={onClose}>
        <ListItemIcon>
          <EditOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
        </ListItemIcon>
        <ListItemText>Editar</ListItemText>
      </MenuItem>
    )}
    {plant?.capabilities.canListSharingAgreements && (
      <MenuItem component={Link} to={`${plantHref(plant)}/sharing-agreements`} onClick={onClose}>
        <ListItemIcon>
          <HandshakeOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />
        </ListItemIcon>
        <ListItemText>Acuerdos de reparto</ListItemText>
      </MenuItem>
    )}
    {plant && actions.remove && <Divider />}
    {plant && actions.remove && (
      <MenuItem
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        <ListItemIcon>
          <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
        </ListItemIcon>
        <ListItemText sx={{ color: "error.main" }}>Eliminar</ListItemText>
      </MenuItem>
    )}
  </RowActionsMenu>
);
