"use client";

// ** MUI Imports
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import { PaginationProps } from "./types";

const DataGridCustomPagination = (props: PaginationProps) => {
  // ** Props
  const { apiRef, page, pageCount } = props;

  return (
    <Pagination
      color="standard"
      variant="outlined"
      shape="rounded"
      page={page + 1}
      count={pageCount}
      // @ts-expect-error
      renderItem={(props2) => <PaginationItem {...props2} disableRipple />}
      onChange={(event: React.ChangeEvent<unknown>, value: number) =>
        apiRef.current.setPage(value - 1)
      }
    />
  );
};

export default DataGridCustomPagination;
