import { useEffect, useState, type FC } from "react";
import { Box } from "@mui/material";
import {PaginationOutlined} from "../pagination/Pagination";
import type { itemListType } from "../../pages/supplyPointsPage/SupplyPointsPage";

interface ItemListProps {
  itemList: itemListType[],
  itemListLength: number,
  children: (item: itemListType, index: number) => React.ReactNode;
}

export const CardList: FC<ItemListProps> = ({ children, itemList, itemListLength }) => {
  const [currentPage, setCurrentPage] = useState(1); 
  const itemsPerPage = 4;
  
  useEffect(() => {
  const lastPage = Math.max(1, Math.ceil(itemListLength / itemsPerPage));
  if (currentPage > lastPage) {
    setCurrentPage(1);
  }
}, [currentPage, itemListLength]);

  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = itemList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Box className="mt-5">
      {/* OPCIÓN INICIAL */}
      <ul>
        {paginatedItems.map((item, index) => (
          <li key={startIndex + index}>
            {children(item, startIndex + index)}
          </li>
        ))}
      </ul>


      <PaginationOutlined
        count={Math.ceil(itemListLength / itemsPerPage)}
        page={currentPage}
        handleChange={handleChange}
      />
    </Box>
  );
};

