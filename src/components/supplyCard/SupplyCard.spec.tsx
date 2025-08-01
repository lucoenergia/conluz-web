import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SupplyCard } from './SupplyCard';
import userEvent from '@testing-library/user-event';

const mockSupply = {
  id: '123',
  code: 'ES123',
  name: 'Suministro Principal',
  address: 'Calle Falsa 123',
  partitionCoefficient: 10,
  enabled: true,
};

describe('SupplyCard', () => {
  it('renders correctly with required props', () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} />
      </MemoryRouter>
    );

    expect(screen.getByText("Suministro Principal")).toBeInTheDocument();
    expect(screen.getByText("ES123")).toBeInTheDocument();
    expect(screen.getByText("10 kWh")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it('renders "Inactivo" chip when enabled is false', () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} enabled={false} />
      </MemoryRouter>
    );
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it('opens and closes the menu on icon button click', async () => {
    render(
      <MemoryRouter>
        <SupplyCard {...mockSupply} />
      </MemoryRouter>
    );


    const user = userEvent.setup();
    await user.click(screen.getByRole('button'));

    expect(screen.getByText("Ver")).toBeVisible();

    await user.keyboard('{Escape}')

    expect(screen.queryByText("Ver")).not.toBeVisible();
  });
});
