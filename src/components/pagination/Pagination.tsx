import Pagination from '@mui/material/Pagination';
import { useState } from 'react';

export default function PaginationOutlined() {


//     El número total de elementos
//     La página actual
//     Un método que llamar al cambiar de página
//     Esto permitiría que el componente que lo utiliza (en nuestro caso CardList) que es quien entiende bien los datos pagine correctamente y muestre solo las entradas correctas.

// Además actualmente este componente siempre muestra el mismo número de entradas, no es nada dinámico.

  const [page, setPage] = useState(1); // esto se quita, porque va a llegar por props

  const handleChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <>
      <Pagination 
        count={10} // variable number that comes from the itemList.length and how many supplypoints per page
        page={page} // esto van a ser props
        onChange={handleChange} // este método tb tiene que llegar por props para que luego pueda subir la info
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