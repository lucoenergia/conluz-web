import type { FC } from "react"
import { CardTemplate } from "../cardTemplate/CardTemplate"
import { Skeleton, Typography } from "@mui/material"

interface LoadingGraphCardProps {
    className?: string;
}

export const LoadingGraphCard: FC<LoadingGraphCardProps> = ({className}) => {

return <CardTemplate className={className}>
        <Typography></Typography>
        <Typography></Typography>
        <Skeleton/>
    </CardTemplate>

}