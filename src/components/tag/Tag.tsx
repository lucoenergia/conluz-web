import { Chip } from "@mui/material"
import type { FC } from "react"

interface TagComponentProps {
    label?: string,
    className?: string,
}
export const TagComponent: FC<TagComponentProps> = ({label, className}) => {

return <>
        <Chip
            label={label}
            className={className}
        />
    </>   
}