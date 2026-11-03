import type { FC } from "react";
import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { RowActionsMenu } from "../../components/ListTable";
import type { SharingAgreementRowActions } from "../../hooks/actions/useSharingAgreementActions";

export interface SharingAgreementRowMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /**
   * The agreement's delete, already resolved by `deletableFromRow`, the same
   * answer that drew its kebab. Undefined, the menu does not open.
   */
  remove: SharingAgreementRowActions["actions"]["remove"];
  onDelete: () => void;
}

/**
 * The sharing agreement list's row menu. Deleting is its only item, in the
 * error colour; the row's title already links to the detail.
 */
export const SharingAgreementRowMenu: FC<SharingAgreementRowMenuProps> = ({ anchorEl, onClose, remove, onDelete }) => (
  <RowActionsMenu anchorEl={remove ? anchorEl : null} onClose={onClose}>
    {remove && (
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
