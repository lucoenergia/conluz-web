import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SupplyCard } from './SupplyCard';

const mockSupply = {
  id: '123',
  name: 'Suministro Principal',
  address: 'Calle Falsa 123',
  partitionCoefficient: 10,
  enabled: true,
  datadisValidDateFrom: 'hace 2 días',
  datadisPointType: 1,
};

describe('SupplyCard', () => {
  it('renders correctly with required props', () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Suministro Principal/i)).toBeInTheDocument();
    expect(screen.getByText(/123/)).toBeInTheDocument();
    expect(screen.getByText(/10 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/Activo/i)).toBeInTheDocument();
  });

  it('renders "Inactivo" chip when enabled is false', () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} enabled={false} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Inactivo/i)).toBeInTheDocument();
  });

  it('opens and closes the menu on icon button click', () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /moreverticon/i });
    fireEvent.click(button);

    expect(screen.getByText(/Ver/i)).toBeInTheDocument();

    fireEvent.click(document.body);

    expect(screen.queryByText(/Ver/i)).not.toBeInTheDocument();
  });
});