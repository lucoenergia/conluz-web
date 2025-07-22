import React from 'react';
import { render, screen } from '@testing-library/react';
import { CardList } from './CardList';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de los datos de ejemplo
const mockItemList = [
  {
    id: '1',
    name: 'Casa',
    address: 'Calle Mayor 1',
    partitionCoefficient: '10',
    enabled: 'activo',
    datadisValidDateFrom: 'hoy',
    datadisPointType: '4.5',
  },
  {
    id: '2',
    name: 'Garaje',
    address: 'Calle Segunda',
    partitionCoefficient: '5',
    enabled: 'inactivo',
    datadisValidDateFrom: 'ayer',
    datadisPointType: '2.5',
  },
];

vi.mock('../supplyCard/SupplyCard', () => ({
  SupplyCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

describe('CardList (unit)', () => {
  it('renders a list of SupplyCards based on itemList', () => {
    render(<CardList itemList={mockItemList} />);

    // Verifica que los nombres estén presentes
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Garaje')).toBeInTheDocument();

    // Verifica que haya dos <li> renderizados
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });

  it('renders nothing if itemList is empty', () => {
    render(<CardList itemList={[]} />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});



