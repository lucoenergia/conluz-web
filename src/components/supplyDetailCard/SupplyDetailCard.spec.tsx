import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { SupplyDetailCard } from './SupplyDetailCard';
import { useMediaQuery } from '@mui/material';

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material')
  return {
    ...actual,
    useMediaQuery: vi.fn(),
  }
});

const mockUseMediaQuery = useMediaQuery as jest.MockedFunction<typeof useMediaQuery>;

test("Regular card renders on big screens", async () => {
  mockUseMediaQuery.mockClear();
  mockUseMediaQuery.mockReturnValue(false);
  render(
    <SupplyDetailCard name='Mi casa' cups='ES012345678' address='Calle del testeo, nº1' partitionCoeficient={1.2345678}/>
  );
  const name = screen.getByText('Mi casa')
  expect(name).toBeVisible();
  const cup = screen.getByText('ES012345678')
  expect(cup).toBeVisible();
  const address = screen.getByText('Calle del testeo, nº1')
  expect(address).toBeVisible();
  const partitionCoeficient = screen.getByText('1.2346%') // We check the number is correctly rounded to 4 decimal places
  expect(partitionCoeficient).toBeVisible();
});


test("Dropdown card renders on small screens", async () => {
  mockUseMediaQuery.mockClear();
  mockUseMediaQuery.mockReturnValue(true);
  render(
    <SupplyDetailCard name='Mi casa' cups='ES012345678' address='Calle del testeo, nº1' partitionCoeficient={1.2345678}/>
  );
  const name = screen.getByText('Mi casa')
  expect(name).toBeVisible();
  const cup = screen.getByText('ES012345678')
  expect(cup).not.toBeVisible();
  const address = screen.getByText('Calle del testeo, nº1')
  expect(address).not.toBeVisible();
  const partitionCoeficient = screen.getByText('1.2346%') // We check the number is correctly rounded to 4 decimal places
  expect(partitionCoeficient).not.toBeVisible();
});
