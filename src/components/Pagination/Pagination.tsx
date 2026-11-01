import { Pagination, type PaginationProps } from "@mui/material";
import type { FC } from "react";

interface PaginationOutlinedProps {
  className?: string;
  count: number;
  page: number;
  handleChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  /** Accessible name of the navigation landmark. */
  ariaLabel?: string;
  /** Accessible name of each control, in the user's language. */
  getItemAriaLabel?: PaginationProps["getItemAriaLabel"];
}

export const PaginationOutlined: FC<PaginationOutlinedProps> = ({
  count,
  handleChange,
  page,
  className,
  ariaLabel,
  getItemAriaLabel,
}) => {
  return (
    <Pagination
      count={count}
      page={page}
      onChange={handleChange}
      variant="outlined"
      color="primary"
      showFirstButton
      showLastButton
      siblingCount={0}
      boundaryCount={0}
      // Spread only when set, so MUI keeps its default name otherwise.
      {...(ariaLabel && { "aria-label": ariaLabel })}
      getItemAriaLabel={getItemAriaLabel}
      className={`mx-auto mt-5 md:mt-15 ${className}`}
    />
  );
};
