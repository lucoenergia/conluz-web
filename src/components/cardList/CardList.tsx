import { useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import {PaginationOutlined} from "../pagination/Pagination";
import React from "react";

interface CardListProps {
  children: React.ReactNode;
}

const ITEMS_PER_PAGE = 5

const calculateStartIndex = (currentPage: number): number => {
  return (currentPage-1)*ITEMS_PER_PAGE;
}

export const CardList: FC<CardListProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState(1); 
  
  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const listItems = useMemo(() => React.Children.toArray(children), [children])
  const startIndex = useMemo(() => calculateStartIndex(currentPage), [currentPage]);

  return (
    <Box className="mt-5 grid content-center">
      <ul>
        {listItems.slice(startIndex, startIndex+ITEMS_PER_PAGE)}
      </ul>
      <PaginationOutlined
        count={Math.ceil(React.Children.toArray(children).length / ITEMS_PER_PAGE)}
        page={currentPage}
        handleChange={handleChange}
      />
    </Box>
  );
};

