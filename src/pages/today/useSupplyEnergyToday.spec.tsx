import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../test/requestRouter";
import { useSupplyEnergyToday } from "./useSupplyEnergyToday";
import { available, energyToday } from "./todayEnergy.testData";

/**
 * UI-TDY-007: today's data of a supply is asked again every 5 minutes while
 * the document is visible, never while it is hidden, and again when the page
 * regains focus.
 *
 * Tier 2: the subject is the cache's refetch behaviour, so the real generated
 * hook and a real QueryClient run, with only the HTTP layer mocked and the
 * timers faked.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const SUPPLY_ID = "supply-1";
const URL = `/api/v1/supplies/${SUPPLY_ID}/energy-today`;
const FIVE_MINUTES = 5 * 60_000;

let visibility: DocumentVisibilityState;
let router: RequestRouter;

/** The document going hidden or visible, as the browser announces it. */
function setVisibility(state: DocumentVisibilityState) {
  visibility = state;
  act(() => {
    window.dispatchEvent(new Event("visibilitychange"));
  });
}

const reads = () => router.requests.filter((request) => request.url === URL).length;
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

async function renderLoaded() {
  renderHookWithProviders(() => useSupplyEnergyToday(SUPPLY_ID));
  await advance(0);
  expect(reads()).toBe(1);
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  router = routeRequests([{ method: "GET", url: URL, respond: () => energyToday(available()) }]);
  mockCustomInstance.mockReset();
  mockCustomInstance.mockImplementation(router.handle);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useSupplyEnergyToday", () => {
  it("UI-TDY-007 asks again after 5 minutes while the document is visible, and not before", async () => {
    await renderLoaded();

    await advance(FIVE_MINUTES - 1_000);
    expect(reads()).toBe(1);
    await advance(1_000);
    expect(reads()).toBe(2);
    await advance(FIVE_MINUTES);
    expect(reads()).toBe(3);
  });

  it("UI-TDY-007 asks nothing while the document is hidden", async () => {
    await renderLoaded();

    setVisibility("hidden");
    await advance(3 * FIVE_MINUTES);

    expect(reads()).toBe(1);
  });

  it("UI-TDY-007 asks again as soon as the page regains focus", async () => {
    await renderLoaded();
    setVisibility("hidden");
    await advance(3 * FIVE_MINUTES);

    setVisibility("visible");
    await advance(0);

    expect(reads()).toBe(2);
  });

  it("UI-TDY-007 asks nothing before a supply is selected", async () => {
    renderHookWithProviders(() => useSupplyEnergyToday(undefined));
    await advance(2 * FIVE_MINUTES);

    expect(router.requests).toEqual([]);
  });
});
