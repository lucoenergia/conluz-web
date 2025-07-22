import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PaginationOutlined from './Pagination';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Helper para aplicar el theme de MUI
const renderWithTheme = (ui: React.ReactElement) => {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('PaginationOutlined (unit)', () => {
  it('renders pagination and starts on page 1', () => {
    renderWithTheme(<PaginationOutlined />);

    const currentPage = screen.getByRole('button', {
      name: /page 1/i,
    });

    expect(currentPage).toHaveAttribute('aria-current', 'page');
  });

  it('updates to page 2 when clicked', () => {
    renderWithTheme(<PaginationOutlined />);

    const page2Button = screen.getByRole('button', {
      name: /go to page 2/i,
    });

    fireEvent.click(page2Button);

    const newCurrentPage = screen.getByRole('button', {
      name: /page 2/i,
    });

    expect(newCurrentPage).toHaveAttribute('aria-current', 'page');
  });
});



