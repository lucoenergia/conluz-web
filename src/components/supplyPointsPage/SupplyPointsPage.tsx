import type { FC } from "react";
import type { SupplyPointData } from "../../utils/types";
import { CardList } from "../cardList/CardList"
import { Box } from "@mui/material";

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
        <CardList itemList={itemsList}/>
    </Box>
}