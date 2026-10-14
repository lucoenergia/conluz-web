import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { StatsCard } from "./StatsCard";

describe("StatsCard", () => {
  // Trends reach the card as a percentage change (0-100 scale), rounded by
  // the pages: a value passed to the formatter undivided would read "1200 %".
  it("UI-FMT-001 shows each trend as a percentage with the shared formatter's spacing", () => {
    renderWithProviders(
      <StatsCard
        title="Consumo"
        stats={[
          { label: "Consumo", value: "10 kWh", trend: 12 },
          { label: "Autoconsumo", value: "6 kWh", trend: -12.5 },
        ]}
      />,
    );

    expect(screen.getByText("12 %")).toBeInTheDocument();
    expect(screen.getByText("12,5 %")).toBeInTheDocument();
  });
});
