import { Menu } from "@mui/material"
import { type FC, type ReactNode } from "react"

interface MenuTemplateProps {
    children: ReactNode,
    anchorElement: HTMLElement | null
    onClose: (event: object) => void;
    compactPadding?: boolean;
}
export const MenuTemplate: FC<MenuTemplateProps> = ({anchorElement, onClose, compactPadding = false, children}) => {
    return <Menu
      sx={{ mt: '45px', 
        ...(compactPadding && {
          '& .MuiMenu-list': {
            paddingTop: 0,
            paddingBottom: 0,
          },
        }),}}
 
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      anchorEl={anchorElement}
      open={Boolean(anchorElement)}
      onClose={onClose}
    >
      {children}
    </Menu>
}
