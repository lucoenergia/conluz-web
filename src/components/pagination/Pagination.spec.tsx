import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PaginationOutlined } from './Pagination';

// Helper para aplicar el theme de MUI
const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('PaginationOutlined (unit)', () => {
  it('renders pagination and starts on page 1', () => {
    renderWithTheme(<PaginationOutlined count={10} page={1} handleChange={() => {}} />);

    const currentPage = screen.getByRole('button', {
      name: /page 1/i,
    });

    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('updates to page 2 when clicked', () => {
    let page = 1
    renderWithTheme(<PaginationOutlined count={10} page={page} handleChange={(_event: React.ChangeEvent<unknown>, value: number) => {page = value}} />);

    const page2Button = screen.getByRole('button', {
      name: /go to page 2/i,
    });

    fireEvent.click(page2Button);
    expect(page).toBe(2);
  });
});



