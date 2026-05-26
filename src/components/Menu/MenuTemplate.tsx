import { Menu } from "@mui/material";
import { type FC, type ReactNode } from "react";
import { radii, shadows, colors } from "../../theme/tokens";

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
        mt: 1,
        "& .MuiPaper-root": {
          borderRadius: radii.default,
          minWidth: 280,
          boxShadow: shadows.dropdown,
          border: `1px solid ${colors.divider}`,
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
