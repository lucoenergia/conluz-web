import '@testing-library/jest-dom'
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SupplyStatsCard } from './SupplyStatsCard';


test("Supply stat card renders all elements correctly", async () => {
  render(
    <SupplyStatsCard consumption={100} selfconsumption={40} surplus={0} selfconstumptionRate={40} utilizationRate={100}/>
  );
  expect(screen.getByText('Consumo')).toBeInTheDocument();
  expect(screen.getByText('100kWh')).toBeInTheDocument();
  expect(screen.getByText('Autoconsumo')).toBeInTheDocument();
  expect(screen.getByText('40kWh')).toBeInTheDocument();
  expect(screen.getByText('Excedente')).toBeInTheDocument();
  expect(screen.getByText('0kWh')).toBeInTheDocument();
  expect(screen.getByText('Porcentaje de autoconsumo')).toBeInTheDocument();
  expect(screen.getByText('40%')).toBeInTheDocument();
  expect(screen.getByText('Porcentaje de aprovechamiento')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});
