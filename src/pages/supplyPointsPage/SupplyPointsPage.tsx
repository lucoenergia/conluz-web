import { useEffect, useMemo, useState, type FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useDisableSupply, useEnableSupply, useGetAllSupplies } from "../../api/supplies/supplies";
import type { SupplyResponse } from "../../api/models";
import { BreadCrumb } from "../../components/breadCrumb/BreadCrumb";
import { SearchBar } from "../../components/searchBar/SearchBar";
import { CardList } from "../../components/cardList/CardList";
import { SupplyCard } from "../../components/supplyCard/SupplyCard";
import { LoadingSupplyCard } from "../../components/supplyCard/LoadingSupplyCard";
import { Link } from "react-router";
import { useErrorDispatch } from "../../context/error.context";

export interface itemListType {
  id: string;
  name: string;
  address: string;
  partitionCoefficient: string;
  enabled: string;
  datadisValidDateFrom: string;
  datadisPointType: string;
}

export const SupplyPointsPage: FC = () => {
  const [searchText, setSearchText] = useState("");
  const errorDispatch = useErrorDispatch();
  const { data: { items: responseFromApi = [] } = {}, isLoading, error, refetch } = useGetAllSupplies({ size: 10000 }); //TODO: Figure out a way to allways get all supplies
  const disableSupply = useDisableSupply();
  const enableSupply = useEnableSupply();

  const disableSupplyPoint = (id: string, successCallback?: Function) => {
    disableSupply.mutate({ id }, {
      onSuccess: () => {
        refetch();
        if (successCallback)
          successCallback();
      }, onError: () => {
        errorDispatch('Ha habido un problema al deshabilitar el punto de suministro. Por favor inténtalo más tarde');
      }
    });
  }

  const enableSupplyPoint = (id: string, successCallback?: Function) => {
    enableSupply.mutate({ id }, {
      onSuccess: () => {
        refetch();
        if (successCallback)
          successCallback();
      }, onError: () => {
        errorDispatch('Ha habido un problema al rehabilitar el punto de suministro. Por favor inténtalo más tarde');
      }
    });
  }

  useEffect(() => {
    if (error) {
      errorDispatch("Hay habido un problema al cargar los puntos de suministro. Por favor, inténtalo más tarde");
    }
  }, [error]);

  const filteredItems: SupplyResponse[] = useMemo(() => {
    return responseFromApi.filter((item) => !searchText || item.name?.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText, responseFromApi]);

  return (
    <Box className="flex flex-col">
      <BreadCrumb steps={[{ label: "Consumo", href: "/supply-points" }]} />
      <Typography className="text-2xl font-bold mt-10 md:mt-0">Puntos de suministro</Typography>
      <Typography className="text-base mb-5">Puntos de suministros registrados en la comunidad energética</Typography>
      <Box className="grid grid-flow-col grid-cols-2 justify-between gap-4">
        <Button
          component={Link}
          variant="outlined"
          to="/supply-points/new"
          size="small"
          className="text-center normal-case leading-normal text-sm sm:text-sm py-1 min-h-0 flex items-center justify-center w-fit shadow-none hover:shadow-md"
        >
          Nuevo punto de suministro
        </Button>
        <SearchBar className="justify-self-end align-text" value={searchText} onChange={setSearchText}></SearchBar>
      </Box>
      {!isLoading && !error && (
        <CardList className="mt-5 grid content-center">
          {filteredItems.map((item) => (
            <SupplyCard
              key={item.id}
              id={item.id}
              code={item.code}
              partitionCoefficient={item.partitionCoefficient ? item.partitionCoefficient * 100 : undefined}
              name={item.name}
              address={item.address}
              enabled={item.enabled}
              onDisable={disableSupplyPoint}
              onEnable={enableSupplyPoint}
            />
          ))}
        </CardList>
      )}
      {isLoading && (
        <CardList>
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingSupplyCard key={i} />
          ))}
        </CardList>
      )}
    </Box>
  );
};
