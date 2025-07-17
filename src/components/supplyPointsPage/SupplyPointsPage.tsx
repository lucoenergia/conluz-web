import type { FC } from "react";
import type { SupplyPointData } from "../../utils/types";
import { CardList } from "../cardList/CardList"
import { Box, Button, Typography } from "@mui/material";
import { BreadCrumb }from "../breadCrumb/BreadCrumb";

export const SupplyPointsPage: FC = () => {
    const responseFromApi = [{
        supplyPointId: 1,
        kWh: 15,
        lastCheckTime: '2 horas',
        supplyPointName: 'Casa',
        address: 'c/ Mayor, 1',
        average: 4.5,
        status: 'Activo',        
    }]
    // const itemsList: SupplyPointData[] = responseFromApi as SupplyPointData[]; 
    const itemsList: SupplyPointData[] = responseFromApi;
return <Box>
        <BreadCrumb className="mt-5 mb-10"></BreadCrumb>
        <Typography className="text-2xl font-bold">Puntos de suministro</Typography>
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
                }}
            >
            Nuevo punto de suministro
            </Button>
        <CardList itemList={itemsList} />
    </Box>
}