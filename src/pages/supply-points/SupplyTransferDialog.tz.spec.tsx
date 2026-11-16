import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { query } from "../../test/queryState";
import { expectDeviceTimeZone } from "../../test/deviceTimeZone";
import { overlayHistorySettled } from "../../components/ResponsiveOverlay/overlayHistory";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";

// Runs in the `app-time-zone` Vitest project, as a device in New York, behind Madrid.
// The backend refuses a transfer dated after today in Madrid, so the default
// date is Madrid's today, not the device's.

vi.mock(import("./useSupplyInActiveCommunity"), () => ({ useSupplyInActiveCommunity: vi.fn() }));
// The roster is not the subject here.
vi.mock(import("./useSupplyOwnerOptions"), () => ({ useSupplyOwnerOptions: vi.fn() }));
// Read by the harness's real CommunityProvider; the community is seeded, so it stays unanswered.
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetSuppliesByUserId: vi.fn(),
}));

import { useGetSuppliesByUserId } from "../../api/users/users";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";
import { useSupplyOwnerOptions } from "./useSupplyOwnerOptions";
import { SupplyTransferDialog } from "./SupplyTransferDialog";

afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  await act(() => overlayHistorySettled());
});

describe("SupplyTransferDialog's default date is Madrid's today (#423)", () => {
  it("runs in the project's device zone", () => {
    expectDeviceTimeZone();
  });

  it("UI-SUP-027 defaults to Madrid's date when New York is still on the day before", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 00:30 on 15 March in Madrid, 19:30 on 14 March in New York.
    vi.setSystemTime(new Date("2026-03-14T23:30:00Z"));
    vi.mocked(useGetSuppliesByUserId).mockReturnValue(query.disabled());
    vi.mocked(useSupplyOwnerOptions).mockReturnValue({ mode: "choose", status: "ready", options: [] });
    vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
      supply: buildSupply({ capabilities: buildSupplyCapabilities({ canTransferOwnership: true }) }),
      isLoading: false,
      isNotFound: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<SupplyTransferDialog supplyId="TEST-SUPPLY-ID" onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Cambiar titular" });
    expect(within(dialog).getByRole("spinbutton", { name: "Dia" })).toHaveTextContent("15");
    expect(within(dialog).getByRole("spinbutton", { name: "Mes" })).toHaveTextContent("03");
    expect(within(dialog).queryByText("La fecha del cambio no puede ser posterior a hoy.")).not.toBeInTheDocument();
  });
});
