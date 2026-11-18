import "@testing-library/jest-dom";
import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";
import { buildSupply } from "../../test/fixtures";
import { TodayContent } from "./TodayContent";
import { NOW, available, energyToday, slots } from "./todayEnergy.testData";

/**
 * UI-TDY-004: skeletons appear only while nothing has arrived, and a poll
 * that fails later keeps the last answer on screen rather than replacing it
 * with an error.
 *
 * Tier 2: the subject is a state that spans a refetch, so the real generated
 * hook and a real QueryClient run, with only the HTTP layer mocked.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

// ApexCharts cannot lay out in jsdom, and the chart's drawing is not this spec's subject.
// String form: the typed one cannot express this module's default export.
vi.mock("react-apexcharts", () => ({ default: () => null }));

const SUPPLY = buildSupply({ id: "supply-1", name: "Casa" });
const URL = `/api/v1/supplies/${SUPPLY.id}/energy-today`;
const FIVE_MINUTES = 5 * 60_000;

let router: RequestRouter;
let fail: boolean;

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  vi.setSystemTime(new Date(NOW));
  fail = false;
  router = routeRequests([
    {
      method: "GET",
      url: URL,
      respond: () => {
        if (fail) throw new Error("network down");
        return energyToday(
          available({
            currentAssignedPowerKW: 0.48,
            assignedEnergyKWh: 3.4,
            assignedPowerCurve: slots("08:00", "13:40", 0.48),
            lastUpdatedAt: "2026-11-12T13:40:00+01:00",
            stale: false,
          }),
        );
      },
    },
  ]);
  mockCustomInstance.mockReset();
  mockCustomInstance.mockImplementation(router.handle);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TodayContent across polls", () => {
  it("UI-TDY-004 shows skeletons only on the first load, and keeps the last answer when a later poll fails", async () => {
    renderWithProviders(<TodayContent supply={SUPPLY} />);
    // The first load: the figures' labels over skeletons, no value yet.
    expect(screen.getByText("Te llega ahora")).toBeInTheDocument();
    expect(screen.queryByText("0,48 kW")).not.toBeInTheDocument();

    await advance(0);
    expect(screen.getByText("Ahora te llegan 0,48 kW de la planta de la comunidad.")).toBeInTheDocument();

    fail = true;
    await advance(FIVE_MINUTES);
    expect(router.requests.filter((request) => request.url === URL)).toHaveLength(2);
    // Let the failure settle: the query cache notifies its observers on a timer.
    await advance(1_000);

    expect(screen.getByText("Ahora te llegan 0,48 kW de la planta de la comunidad.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });
});
