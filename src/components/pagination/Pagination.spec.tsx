import { render, screen, fireEvent } from '@testing-library/react';
import { SupplyPointsPage } from '../supplyPointsPage/SupplyPointsPage';
import '@testing-library/jest-dom';

describe('PaginationOutlined inside SupplyPointsPage', () => {
  it('renders the pagination component', () => {
    render(<SupplyPointsPage />);

    // Asegura que se renderiza el componente de paginación
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('can click on a specific page', () => {
    render(<SupplyPointsPage />);

    const pageButton = screen.getByRole('button', { name: '2' });
    fireEvent.click(pageButton);

    // No hay efecto visible porque PaginationOutlined no tiene un handler de cambio de página aún.
    // Pero verificamos que el botón está activo después del clic
    expect(pageButton).toHaveAttribute('aria-current', 'true');
  });
});
