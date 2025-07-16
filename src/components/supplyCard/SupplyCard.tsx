import type { FC } from "react";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { Box, Chip, Typography } from "@mui/material";
import type { SupplyPointData } from "../../utils/types";


export const SupplyCard: FC<SupplyPointData> = ({
    supplyPointId, 
    kWh, 
    lastCheckTime,
    supplyPointName,
    address,
    average,
    status }) => {
return <CardTemplate className={'grid grid-flow-col grid-cols-3 items-center justify-items-center grow md:grid-cols-6 gap-4'}>
    <Box>
        <Typography>{kWh}kWh</Typography>
        <Typography>{lastCheckTime}</Typography>
    </Box>
    <Box className='col-span-2 col-start-2'>
        <Typography>{supplyPointName}</Typography>
        <Typography>{supplyPointId}</Typography>
    </Box>
    <Box>
        <Typography>{address}</Typography>
        <Typography>{average}</Typography>
    </Box>
    <Box>{
        <Chip
            label={status === 'activo' ? 'Activo' : 'Inactivo'}
            className={status === 'activo'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'}
        />
        }
    </Box>
    <Box>
        {/* <button>
            <i class="fas fa-ellipsis-vertical"></i>
        </button> */}
    </Box>
</CardTemplate>
}