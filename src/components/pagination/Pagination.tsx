import Pagination from '@mui/material/Pagination';
import { type FC } from 'react';

interface PaginationOutlinedProps {
  count: number,
  page: number,
  handleChange: Function
}

export const PaginationOutlined: FC<PaginationOutlinedProps> = ({count, handleChange, page}) => {

  return (
    <>
      <Pagination 
        count={count} // total number of pages
        page={page} // current page
        onChange={() => {handleChange()}} 
        variant="outlined" 
        color="primary" 
        showFirstButton 
        showLastButton
        siblingCount={0}
        boundaryCount={0}
        className='mx-auto mt-5 md:mt-15'/>
    </>
  );
}