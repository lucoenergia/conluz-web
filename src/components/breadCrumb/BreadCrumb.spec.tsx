import { render, screen, fireEvent } from '@testing-library/react';
import { BreadCrumb } from './BreadCrumb';
import '@testing-library/jest-dom';

describe('BreadCrumb component', () => {
  it('renders correctly with default props', () => {
    render(<BreadCrumb />);

    expect(screen.getByText('Consumo')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when IconButton is clicked', () => {
    render(<BreadCrumb />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getByText('Breadcrumb 2')).toBeInTheDocument();
    expect(screen.getByText('Breadcrumb 3')).toBeInTheDocument();
    expect(screen.getByText('Breadcrumb 4')).toBeInTheDocument();
  });

  it('closes the menu when a MenuItem is clicked', () => {
    render(<BreadCrumb />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const menuItem = screen.getByText('Breadcrumb 2');
    fireEvent.click(menuItem);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
