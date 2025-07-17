import type { FC } from "react";
import type { SupplyPointData } from "../../utils/types";
import { CardList } from "../cardList/CardList"
import { Box, Button, Typography } from "@mui/material";
import { BreadCrumb }from "../breadCrumb/BreadCrumb";
import PaginationOutlined from "../pagination/Pagination";

export const SupplyPointsPage: FC = () => {
    const responseFromApi = [{
        supplyPointId: 'E01234567876543',
        kWh: '15',
        lastCheckTime: '2 horas',
        supplyPointName: 'Casa',
        address: 'c/ Mayor, 1',
        average: 4.5,
        status: 'activo',        
    }, {
        supplyPointId: 'E01234567876547',
        kWh: '8',
        lastCheckTime: '7 horas',
        supplyPointName: 'Corral',
        address: 'c/ Mayor, 4',
        average: 2.5,
        status: 'inactivo', 
    },{
        supplyPointId: 'E01234567876549',
        kWh: '5',
        lastCheckTime: '3 horas',
        supplyPointName: 'Garaje',
        address: 'c/ Mayor, 3',
        average: 0.5,
        status: 'activo', 
    }]
    // const itemsList: SupplyPointData[] = responseFromApi as SupplyPointData[]; 
    const itemsList: SupplyPointData[] = responseFromApi;
return <Box className='flex flex-col'>
        <BreadCrumb className="mt-5 mb-10 hidden md:block"></BreadCrumb>
        <Typography className="text-2xl font-bold mt-10 md:mt-0">Puntos de suministro</Typography>
        <Typography className="text-base mb-5" >Puntos de suministros registrados en la comunidad energética</Typography>
            <Button 
                type="link" 
                variant="outlined" 
                href="#new-supply-point" 
                size="small" 
                sx={{
                    textTransform: 'none',
                    lineHeight: 'normal',
                    fontSize: '0.875rem', 
                    paddingY: '4px', 
                    minHeight: 'auto',
                    alignItems: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                    width: 'fit-content',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 3,
                    },                    
                }}>
                Nuevo punto de suministro
            </Button>
            <CardList itemList={itemsList} />
            <PaginationOutlined/>
    </Box>
}