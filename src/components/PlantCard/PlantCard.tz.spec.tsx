import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { PlantCard } from "./PlantCard";

// Runs in the `app-time-zone` Vitest project, as a device in New York.
describe("PlantCard in a device time zone other than the app's", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-FMT-002 shows the connection date in Madrid, where it is already the next day", () => {
    // 22:30Z on 1 August is 00:30 on 2 August in Madrid, still 1 August in New York.
    renderWithProviders(
      <PlantCard id="plant-1" code="NE=1" name="Planta Norte" address="Calle Sol 1" totalPower={63} connectionDate="2026-08-01T22:30:00Z" />,
    );

    expect(screen.getByText("2 ago 2026")).toBeInTheDocument();
  });
});
