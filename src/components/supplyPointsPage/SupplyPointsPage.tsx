import { useMemo, useState, type FC } from "react";
import { CardList } from "../cardList/CardList"
import { Box, Button, Typography } from "@mui/material";
import { BreadCrumb }from "../breadCrumb/BreadCrumb";
import PaginationOutlined from "../pagination/Pagination";
import { SearchBar } from "../searchBar/SearchBar";
import type { SupplyResponse } from "../../api/models";

export const SupplyPointsPage: FC = () => {
const [searchText, setSearchText] = useState('');

const responseFromApi = [{
    id: 'E01234567876543',
    name: 'Casa',
    address: 'c/ Mayor, 1',
    partitionCoefficient: '15',
    enabled: 'activo',        
    datadisValidDateFrom: '2 horas',
    datadisPointType: '4.5',
}, {
    id: 'E01234567876547',
    name: 'Corral', 
    address: 'c/ Mayor, 1',
    partitionCoefficient: '4',
    enabled: 'inactivo',        
    datadisValidDateFrom: '7 horas',
    datadisPointType: '2.5',
},{
    id: 'E01234567876549',
    name: 'Garaje',
    address: 'c/ Mayor, 8',
    partitionCoefficient: '5',
    enabled: 'activo', 
    datadisValidDateFrom: '3 horas',
    datadisPointType: '0.5',
}]
const itemsList: SupplyResponse[] = responseFromApi;

const filteredItems: SupplyResponse[] = useMemo(() => {
return responseFromApi.filter((item) =>
    item.name.toLowerCase().includes(searchText.toLowerCase())
);
}, [searchText]);

return <Box className='flex flex-col'>
        <BreadCrumb className="mt-5 mb-10 hidden md:block"></BreadCrumb>
        <Typography className="text-2xl font-bold mt-10 md:mt-0">Puntos de suministro</Typography>
        <Typography className="text-base mb-5" >Puntos de suministros registrados en la comunidad energética</Typography>
        {/* <Box className='flex flex-row justify-between gap-4'>  */}
        <Box className='grid grid-flow-col grid-cols-6 md:grid-cols-4 gap-4'>
        {/* <Box className='grid grid-flow-col grid-cols-6 md:grid-cols-4'> */}
            <Button 
                type="link" 
                variant="outlined" 
                href="#new-supply-point" 
                size="small" 

                sx={{
                    gridColumn: { xs: 'span 3', sm: 'span 1' },
                    // gridColumn: { xs: 'span 4', sm: 'span 1' },
                    textAlign: 'center',
                    textTransform: 'none',
                    lineHeight: 'normal',
                    fontSize: { xs: 'small', sm: '0.875rem'}, 
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
            <SearchBar 
                className='col-span-3 md:col-span-1 md:col-start-4 justify-end'
                value={searchText} 
                onChange={setSearchText}>
            </SearchBar>
            {/* <SearchBar className='col-span-2 md:col-span-1 md:col-start-4 justify-end'></SearchBar> */}

        </Box>    
        <CardList itemList={searchText.trim() ? filteredItems : itemsList} />
        <PaginationOutlined/>
    </Box>
}