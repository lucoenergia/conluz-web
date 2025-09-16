import { render, screen } from '@testing-library/react';
import { CardList } from './CardList';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { SupplyCard } from '../supplyCard/SupplyCard';

// Mock de los datos de ejemplo
const mockItemList = [
  {
    code: '1',
    name: 'Casa',
    address: 'Calle Mayor 1',
    partitionCoefficient: 10,
    enabled: true,
    datadisValidDateFrom: 'hoy',
    datadisPointType: "4.5",
  },
  {
    code: '2',
    name: 'Garaje',
    address: 'Calle Segunda',
    partitionCoefficient: 5,
    enabled: false,
    datadisValidDateFrom: 'ayer',
    datadisPointType: "2.5",
  },
];

vi.mock('../supplyCard/SupplyCard', () => ({
  SupplyCard: ({ name }: { name: string }) => <div>{name}</div>,
}));

describe('CardList (unit)', () => {
  it('renders a list of SupplyCards based on itemList', () => {
    render(<CardList>
        {mockItemList.map((item) => (
          <SupplyCard
            key={item.code}
            code={item.code}
            partitionCoefficient={(item.partitionCoefficient * 100)}
            name={item.name}
            address={item.address}
            enabled={item.enabled}
            onDisable={() => true}
            onEnable={() => true}
          />))}
    </CardList>);

    // Verifica que los nombres estén presentes
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Garaje')).toBeInTheDocument();

  });

});



