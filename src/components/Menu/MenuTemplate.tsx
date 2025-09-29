import { Menu } from "@mui/material";
import { type FC, type ReactNode } from "react";

interface MenuTemplateProps {
  children: ReactNode;
  anchorElement: HTMLElement | null;
  onClose: (event: React.MouseEvent) => void;
  compactPadding?: boolean;
}
export const MenuTemplate: FC<MenuTemplateProps> = ({ anchorElement, onClose, compactPadding = false, children }) => {
  return (
    <Menu
      sx={{
        mt: "8px",
        "& .MuiPaper-root": {
          borderRadius: 2,
          minWidth: 280,
          boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        },
        "& .MuiMenu-list": {
          paddingTop: 0,
          paddingBottom: 0,
          ...(compactPadding && {
            paddingTop: 0,
            paddingBottom: 0,
          }),
        },
      }}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      anchorEl={anchorElement}
      open={Boolean(anchorElement)}
      onClose={onClose}
    >
      {children}
    </Menu>
  );
};
