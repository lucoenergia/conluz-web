import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { SupplyStatsCard } from "./SupplyStatsCard";

test("Supply stat card renders all elements correctly", async () => {
  render(
    <SupplyStatsCard
      consumption={100}
      selfconsumption={40}
      surplus={0}
      selfconstumptionRate={40}
      utilizationRate={100}
    />,
  );
  expect(screen.getByText("Consumo")).toBeInTheDocument();
  expect(screen.getByText("100 kWh")).toBeInTheDocument();
  expect(screen.getByText("Autoconsumo")).toBeInTheDocument();
  expect(screen.getByText("40 kWh")).toBeInTheDocument();
  expect(screen.getByText("Excedente")).toBeInTheDocument();
  expect(screen.getByText("0 kWh")).toBeInTheDocument();
  expect(screen.getByText("Porcentaje de autoconsumo")).toBeInTheDocument();
  expect(screen.getByText("40 %")).toBeInTheDocument();
  expect(screen.getByText("Porcentaje de aprovechamiento")).toBeInTheDocument();
  expect(screen.getByText("100 %")).toBeInTheDocument();
});

// The rates reach the card on a 0-100 scale: a value passed to the formatter
// undivided would read "5890 %".
test("UI-FMT-001 formats non-integer kWh and percentages with a decimal comma", () => {
  render(
    <SupplyStatsCard
      consumption={312.567}
      selfconsumption={184.2}
      surplus={42.8}
      selfconstumptionRate={58.9}
      utilizationRate={81.125}
    />,
  );

  expect(screen.getByText("312,57 kWh")).toBeInTheDocument();
  expect(screen.getByText("184,2 kWh")).toBeInTheDocument();
  expect(screen.getByText("42,8 kWh")).toBeInTheDocument();
  expect(screen.getByText("58,9 %")).toBeInTheDocument();
  expect(screen.getByText("81,13 %")).toBeInTheDocument();
});
