import { Menu } from "@mui/material"
import { type FC, type ReactNode } from "react"

interface MenuTemplateProps {
    children: ReactNode,
    anchorElement: HTMLElement | null
    onClose: () => void;
}
export const MenuTemplate: FC<MenuTemplateProps> = ({anchorElement, onClose, children}) => {
    return <Menu
      sx={{ mt: '45px' }}
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