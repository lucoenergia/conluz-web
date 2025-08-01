import { useEffect, useState, type FC } from "react";
import { Box } from "@mui/material";
import {PaginationOutlined} from "../pagination/Pagination";
import type { itemListType } from "../../pages/supplyPointsPage/SupplyPointsPage";

interface ItemListProps {
  itemList: any[],
  itemListLength: number,
  children: (item: any, index: number) => React.ReactNode;
}

export const CardList: FC<ItemListProps> = ({ children, itemList, itemListLength }) => {
  const [currentPage, setCurrentPage] = useState(1); 
  const itemsPerPage = 5;
  
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
    <Box className="mt-5 grid content-center">
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

