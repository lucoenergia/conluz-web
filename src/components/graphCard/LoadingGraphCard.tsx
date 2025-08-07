import type { FC } from "react"
import { CardTemplate } from "../cardTemplate/CardTemplate"
import { Skeleton, Typography } from "@mui/material"

interface LoadingGraphCardProps {
    className?: string;
}

export const LoadingGraphCard: FC<LoadingGraphCardProps> = ({className}) => {

return <CardTemplate className={`${className} rounded-xl`}>
        <Typography className="font-bold font-black text-sm mt-3 mr-3 ml-3 mb-2"></Typography>
        <Typography className="text-xs font-sx mr-3 ml-3"></Typography>
        <Skeleton/>
    </CardTemplate>

}