import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { buildSharingAgreement } from "../../test/fixtures";
import { SharingAgreementDetailHeader } from "./SharingAgreementDetailHeader";

// Runs in the `app-time-zone` Vitest project: the device is in New York. A
// local date read as an instant at UTC midnight is the evening before there.

describe("the distributor file sent date shows the day it names, wherever the device is", () => {
  it("runs as a device in New York", () => {
    expectDeviceTimeZone();
  });

  it("UI-AGR-020 shows 1 March for a file sent on 2026-03-01", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SharingAgreementDetailHeader
        agreement={buildSharingAgreement({ distributorFileSentOn: "2026-03-01" })}
        nextStep={{ kind: "NONE" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^Ver \d+ datos? más/ }));

    expect(screen.getByText("1 de marzo de 2026")).toBeInTheDocument();
  });
});
