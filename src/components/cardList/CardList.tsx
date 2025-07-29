import type { FC } from "react";
import { SupplyCard } from "../supplyCard/SupplyCard";
import { Box } from "@mui/material";
import type { SupplyResponse } from "../../api/models";
import PaginationOutlined from "../pagination/Pagination";

interface ItemListProps {
  itemList: SupplyResponse[];
}



// debería servir tb para renderizar listado de cards de usuarias...
// este componente deberia aportar los estilos y la paginación
// de todos los children que llegan recorto lo s que tengan que ver con página 

export const CardList: FC<ItemListProps> = ({ itemList }) => {
  return (
    <Box className="mt-5">
      <ul>
        {itemList.map((item: SupplyResponse, index:number) => (
          <li key={index}>
            <SupplyCard
              id={item.id}
              partitionCoefficient={item.partitionCoefficient}
              datadisValidDateFrom={item.datadisValidDateFrom}
              name={item.name}
              address={item.address}
              datadisPointType={item.datadisPointType}
              enabled={item.enabled}
            />
          </li>
        ))}
      </ul>
      <PaginationOutlined/>
    </Box>
  );
};