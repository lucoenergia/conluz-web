import { useState, type FC, type ReactNode } from "react";
import { Box } from "@mui/material";
import {PaginationOutlined} from "../pagination/Pagination";
import type { itemListType } from "../supplyPointsPage/SupplyPointsPage";

interface ItemListProps {
  itemList: itemListType[],
  itemListLength: number,
  children: (item: itemListType, index: number) => React.ReactNode;
}


// debería servir tb para renderizar listado de cards de usuarias...
// este componente deberia aportar los estilos y la paginación
// de todos los children que llegan recorto lo s que tengan que ver con página 

export const CardList: FC<ItemListProps> = ({ children, itemList, itemListLength }) => {
  const [currentPage, setCurrentPage] = useState(1); 

  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  return (
    <Box className="mt-5">
      <ul>{
          itemList.map((item: itemListType, index:number) => (
            console.log(item.enabled),
          <li key={index}>
            {children(item, index)}

          </li>
          ))
        }
        
      </ul>
      <PaginationOutlined count={Math.ceil(itemListLength/5)} page={currentPage} handleChange={handleChange} />
    </Box>
  );
};