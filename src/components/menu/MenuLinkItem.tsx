import { MenuItem } from "@mui/material";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";

interface MenuLinkItemProps {
  to: string,
  children?: ReactNode,
  className? : string
  selected?: boolean
}

export const MenuLinkItem: FC<MenuLinkItemProps> = ({ to, children, className, selected = false }) => {
  return <Link to={to} className={className}><MenuItem selected={selected}>{ children }</MenuItem></Link>
}
