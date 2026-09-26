import type { FC, ReactNode } from "react";
import { Menu } from "@mui/material";
import { shadows } from "../../theme/tokens";

export interface RowActionsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** The MenuItems; destructive ones go last, below a Divider, in "error.main". */
  children: ReactNode;
}

/** The row kebab menu of a list page, anchored under the button with an arrow pointing at it. */
export const RowActionsMenu: FC<RowActionsMenuProps> = ({ anchorEl, onClose, children }) => (
  <Menu
    anchorEl={anchorEl}
    open={Boolean(anchorEl)}
    onClose={onClose}
    PaperProps={{
      elevation: 0,
      sx: {
        overflow: "visible",
        filter: shadows.menuFilter,
        mt: 1.5,
        minWidth: 200,
        "&:before": {
          content: '""',
          display: "block",
          position: "absolute",
          top: 0,
          right: 14,
          width: 10,
          height: 10,
          bgcolor: "background.paper",
          transform: "translateY(-50%) rotate(45deg)",
          zIndex: 0,
        },
      },
    }}
    transformOrigin={{ horizontal: "right", vertical: "top" }}
    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
  >
    {children}
  </Menu>
);
