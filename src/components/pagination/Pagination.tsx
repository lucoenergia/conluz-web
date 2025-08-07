import { Pagination } from '@mui/material';
import type { FC } from 'react';

interface PaginationOutlinedProps {
  className: string,
  count: number,
  page: number,
  handleChange: (event: React.ChangeEvent<unknown>, value: number) => void
}

export const PaginationOutlined: FC<PaginationOutlinedProps> = ({ count, handleChange, page, className }) => {
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
      className={`mx-auto mt-5 md:mt-15 ${className}`}
    />
  );
};
