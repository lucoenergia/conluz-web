import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildSharingAgreement } from "../../test/fixtures";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { SharingAgreementCard } from "./SharingAgreementCard";

// Runs in the `app-time-zone` Vitest project, as a device in New York.
describe("SharingAgreementCard in a device time zone other than the app's", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-FMT-002 shows the creation date in Madrid, where it is already the next day", () => {
    // 22:30Z on 1 August is 00:30 on 2 August in Madrid, still 1 August in New York.
    renderWithProviders(
      <SharingAgreementCard
        plantId="plant-1"
        agreement={buildSharingAgreement({ plantId: "plant-1", createdAt: "2026-08-01T22:30:00Z" })}
      />,
    );

    expect(screen.getByText("2 de agosto de 2026")).toBeInTheDocument();
  });
});
