import { MenuItem } from "@mui/material";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";

interface MenuLinkItemProps {
  to: string,
  children?: ReactNode,
  className? : string
}

export const MenuLinkItem: FC<MenuLinkItemProps> = ({ to, children, className }) => {
  return <Link to={to} className={className}><MenuItem>{ children }</MenuItem></Link>
}
