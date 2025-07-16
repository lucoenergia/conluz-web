import Card from "@mui/material/Card"
import type { FC, ReactNode } from "react"

interface CardTemplateProps {
    children: ReactNode,
    className?: string;
}

export const CardTemplate: FC<CardTemplateProps> = ({children, className}) => {
 return <Card border-black focus:border-yellow-50 w-full className={className}>{children}</Card>
}