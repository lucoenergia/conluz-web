import { useEffect, useMemo, useState, type FC } from "react";
import { Box } from "@mui/material";
import { PaginationOutlined } from "../pagination/Pagination";
import React from "react";

interface CardListProps {
  children?: React.ReactNode;
  className?: string;
}

const ITEMS_PER_PAGE = 5;

const calculateStartIndex = (currentPage: number): number => {
  return (currentPage - 1) * ITEMS_PER_PAGE;
};

export const CardList: FC<CardListProps> = ({ children, className }) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [children]);

  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const listItems = useMemo(() => React.Children.toArray(children), [children]);
  const startIndex = useMemo(() => calculateStartIndex(currentPage), [currentPage]);

  return (
    <Box className="mt-5 grid content-center">
      <Box className={className}>
        <ul>{listItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)}</ul>
      </Box>
      <PaginationOutlined
        count={Math.ceil(React.Children.toArray(children).length / ITEMS_PER_PAGE)}
        page={currentPage}
        handleChange={handleChange}
      />
    </Box>
  );
};
