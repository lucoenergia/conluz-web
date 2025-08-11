import { Typography } from "@mui/material";
import type { FC } from "react";


interface StatProps {
  label: string,
  value: string,
  variant?: 'normal' | 'big',
  className?: string
}

const textAlign = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center'
} as const

export const Stat: FC<StatProps> = ({ label, value, variant='normal', className}) => {
  return (
    <div className={className}>
        <Typography className={variant === 'normal' ? "font-semibold" : "font-light"}>{label}</Typography>
        <Typography className={variant === 'normal' ? 'text-sm font-light' : 'text-2xl font-bold'}>{value}</Typography>
    </div>
  )
}
