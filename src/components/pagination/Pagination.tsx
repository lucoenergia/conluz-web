import Pagination from '@mui/material/Pagination';
import { useState } from 'react';

export default function PaginationOutlined() {
  const [page, setPage] = useState(1);

  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <>
      <Pagination 
        count={10} // variable number that comes from the itemList.length and how many supplypoints per page
        page={page}
        onChange={handleChange}
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