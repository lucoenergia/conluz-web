import { type FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Typography } from "@mui/material";
import { LabeledIcon } from "../labeled-icon/LabeledIcon";
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import WhereToVoteOutlinedIcon from '@mui/icons-material/WhereToVoteOutlined';
import type { itemListType } from "../../pages/supplyPointsPage/SupplyPointsPage";
import { TagComponent } from "../tag/Tag";
import { DisplayMenu } from "../menu/DisplayMenu";


// generar unas props propias, pq no necesita todos los campos del supplresponse 
// y tb por aislar las dependencias -> ahora mismo lo hacemos depender de orval
// apañar para que si viene undefined de supplyresponse pongamos un string vacío
export const SupplyCard: FC<itemListType> = ({
    id, 
    name,
    address,
    partitionCoefficient,
    enabled,
    datadisValidDateFrom,
    datadisPointType,
    }) => {

return <CardTemplate className={'grid grid-flow-col grid-cols-5 h-18 items-center justify-items-center md:content-center md:grid-cols-10 gap-4 mt-5'}>
    <Box className="col-span-2 justify-center hidden md:block">
        <Typography className="text-2xl font-semibold">{partitionCoefficient} kWh</Typography>
        <Typography className="text-sm text-gray-500 justify-center" >(Hace {datadisValidDateFrom})</Typography>
    </Box>
    <Box className='col-span-3 md:col-span-3 md:col-start-3 justify-self-start'>
        <Typography className="text-lg font-semibold ml-4 md:ml-0">{name}</Typography>
        <Typography className="text-sm ml-4 md:ml-0">{id}</Typography>
    </Box>
    <Box className='col-span-3 justify-self-start hidden md:block'>
        <LabeledIcon
            icon={WhereToVoteOutlinedIcon}
            iconPosition="left"
            justify="start"
            label= {address}
            labelSize="text-sm"

        />
        <LabeledIcon
            icon={PercentOutlinedIcon}
            iconPosition="left"
            justify="start"
            label={datadisPointType}
            labelSize="text-sm"
        />
    </Box>
    <Box className='justify-self-end md:self-center'>
        <TagComponent 
            label={enabled === 'activo' ? 'Activo' : 'Inactivo'} 
            className={`w-19 md:w-20 h-6 md:h-8 text-xs md:text-sm leading-6 md:leading-8 flex items-center justify-center mb-2 md:mb-0 text-white 
                ${ enabled === "activo" ? 'bg-green-600' : 'bg-red-600'}`}/>
        <Typography className="text-sm text-gray-500 text-center md:hidden">{partitionCoefficient} kWh</Typography>
    </Box>
        <DisplayMenu/>
    <Box>
    </Box>
</CardTemplate>
}