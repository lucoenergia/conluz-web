import { useMemo, useState, type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useGetAllSupplies } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SearchBar } from "../../components/searchBar/SearchBar";
import { CardList } from "../../components/cardList/CardList";
import { SupplyCard } from "../../components/supplyCard/SupplyCard";
import { LoadingSupplyCard } from "../../components/supplyCard/LoadingSupplyCard";

export interface itemListType {
  id: string,
  name: string,
  address: string,
  partitionCoefficient: string,
  enabled: string,
  datadisValidDateFrom: string,
  datadisPointType: string
}

export const SupplyPointsPage: FC = () => {
  const [searchText, setSearchText] = useState('');
  const linkName = 'Consumo';
  const href = '#consumption'

  const { data: { items: responseFromApi = [] } = {}, isLoading, error } = useGetAllSupplies({});
  
  const filteredItems: SupplyResponse[] = useMemo(() => {
    return responseFromApi.filter((item) =>
      item.name?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, responseFromApi]);


  return <Box className='flex flex-col'>
    <BreadCrumb className="mt-5 mb-10 hidden md:block" linkName={linkName} href={href}></BreadCrumb>
    <Typography className="text-2xl font-bold mt-10 md:mt-0">Puntos de suministro</Typography>
    <Typography className="text-base mb-5" >Puntos de suministros registrados en la comunidad energética</Typography>
    <Box className='grid grid-flow-col grid-cols-2 justify-between gap-4'>
      <Button
        type="link"
        variant="outlined"
        href="#new-supply-point"
        size="small"
        className="
                    text-center 
                    normal-case 
                    leading-normal 
                    text-[0.875rem] sm:text-sm
                    py-1 
                    min-h-0 
                    flex items-center justify-center 
                    w-fit 
                    shadow-none 
                    hover:shadow-md
                    ">
                Nuevo punto de suministro
            </Button>
            <SearchBar 
                className="justify-self-end align-text"
                value={searchText} 
                onChange={setSearchText}
            >
            </SearchBar>
        </Box>   
    {!isLoading && !error &&
      <CardList
        itemList={searchText.trim() ? filteredItems : responseFromApi}
        itemListLength={(searchText.trim() ? filteredItems : responseFromApi).length}>
        {(item) => (
          <SupplyCard
            key={item.id}
            id={item.code}
            partitionCoefficient={(item.partitionCoefficient*100).toFixed(4)}
            datadisValidDateFrom={item.datadisValidDateFrom}
            name={item.name}
            address={item.address}
            datadisPointType={item.datadisPointType}
            enabled={item.enabled}
          />)}

      </CardList>
    }
    { isLoading &&
      <CardList
        itemList={[{},{},{},{},{}]}
        itemListLength={5}
      >
      {
      () => (
        <LoadingSupplyCard/>
      )
    }
      </CardList>
  }
  </Box>
}
