import { MenuItem } from "@mui/material";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";

interface MenuLinkItemProps {
  to: string,
  children?: ReactNode
}

export const MenuLinkItem: FC<MenuLinkItemProps> = ({ to, children }) => {
  return <Link to={to}><MenuItem>{ children }</MenuItem></Link>
}
