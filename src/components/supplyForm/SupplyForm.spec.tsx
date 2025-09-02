import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Crear los mocks
const mockNavigate = vi.fn();
const mockHandleSubmit = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Imports después de los mocks
import { MemoryRouter } from 'react-router';
import { SupplyForm } from './SupplyForm';
import userEvent from '@testing-library/user-event';

describe('Supply Form', () => {
  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    // Configurar mocks
    mockNavigate.mockClear();
    mockHandleSubmit.mockClear();
  });
  
  const setup = () => {
    render(
      <MemoryRouter>
        <SupplyForm handleSubmit={mockHandleSubmit}/>
      </MemoryRouter>
    );
  };

  it('Submits correct data', async () => {
    const user = userEvent.setup()
    setup();
    await user.type(screen.getByLabelText('Nombre'), "Mi casa");
    await user.type(screen.getByLabelText('CUPS'), "ES002100823463");
    await user.type(screen.getByLabelText('Dirección'), "Calle Escuadra 3");
    await user.type(screen.getByLabelText('Coeficiente de reparto (%)'), "0.002345");
    await user.type(screen.getByLabelText('Referencia catastral'), "AS35NB354223");
    await user.click(screen.getByRole('button'))
    expect(mockHandleSubmit).toBeCalledWith({name: 'Mi casa', code: "ES002100823463", address: 'Calle Escuadra 3', partitionCoefficient: 0.002345, personalId: "01234567Z" }) //TODO: Set the correct personalId when endpoint is available
  });
  
  it('Displays Partition Coeficient error', async () => {
    const user = userEvent.setup()
    setup();
    await user.type(screen.getByLabelText('Nombre'), "Mi casa");
    await user.type(screen.getByLabelText('CUPS'), "ES002100823463");
    await user.type(screen.getByLabelText('Dirección'), "Calle Escuadra 3");
    await user.type(screen.getByLabelText('Coeficiente de reparto (%)'), "0.02");
    await user.type(screen.getByLabelText('Referencia catastral'), "AS35NB354223");
    await user.click(screen.getByRole('button'))
    expect(mockHandleSubmit).toBeCalledTimes(0);
    expect(screen.getByText("Por favor, introduce un numero de 6 decimales")).toBeVisible();
  });


});
