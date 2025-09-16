import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SupplyCard } from './SupplyCard';
import userEvent from '@testing-library/user-event';

const mockSupply = {
  id: '123',
  code: 'ES123',
  name: 'Suministro Principal',
  address: 'Calle Falsa 123',
  partitionCoefficient: 4.234859,
  enabled: true,
  lastMeassurement: 10,
  lastConnection: '6 días',
  onDisable: () => true,
  onEnable: () => true
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
    expect(screen.getAllByText("10 kWh").length).toBe(2);
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
