import Pagination from '@mui/material/Pagination';

export default function PaginationOutlined() {

  return (
    <>
      <Pagination 
        count={10} // variable number that comes from the itemList.length and how many supplypoints per page
        variant="outlined" 
        color="primary" 
        showFirstButton 
        showLastButton
        siblingCount={0}
        boundaryCount={0}
        className='ml-auto md:mt-15'/>
    </>
  );
}