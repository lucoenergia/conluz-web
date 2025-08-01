import { render, screen } from '@testing-library/react';
import { BreadCrumb } from './BreadCrumb';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router';

describe('BreadCrumb component', () => {
  it('renders correctly', () => {

    const steps = [
      { label: 'Consumo', href: "/supply-points"},
      { label: 'Detalle', href: "/supply-points/details"}
    ]

    render(<MemoryRouter><BreadCrumb steps={steps}/></MemoryRouter>);

    expect(screen.getByText('Consumo')).toBeInTheDocument();
    expect(screen.getByText('Detalle')).toBeInTheDocument();
  });

});
