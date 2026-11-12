import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHookWithProviders } from "../../../test/renderWithProviders";
import { routeRequests, type RequestRouter } from "../../../test/requestRouter";
import { INVERTER_REFRESH_MS, useInverterToday } from "./useInverterToday";
import { available } from "./inverterToday.testData";

/**
 * D2 of #406: today's inverter block is asked again every 5 minutes while the
 * document is visible, never while it is hidden, and again when the page
 * regains focus.
 *
 * Tier 2: the subject is the cache's refetch behaviour, so the real generated
 * hook and a real QueryClient run, with only the HTTP layer mocked and the
 * timers faked.
 */
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from this module.
vi.mock(import("../../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

const PLANT_ID = "plant-1";
const URL = `/api/v1/plants/${PLANT_ID}/inverter-production/today`;

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
  renderHookWithProviders(() => useInverterToday(PLANT_ID));
  await advance(0);
  expect(reads()).toBe(1);
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  router = routeRequests([{ method: "GET", url: URL, respond: () => available() }]);
  mockCustomInstance.mockReset();
  mockCustomInstance.mockImplementation(router.handle);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("UI-PLT-012 today's inverter production refreshes while it is looked at (#406)", () => {
  it("UI-PLT-012 AC14 asks again after 5 minutes while the document is visible, and not before", async () => {
    await renderLoaded();

    await advance(INVERTER_REFRESH_MS - 1_000);
    expect(reads()).toBe(1);
    await advance(1_000);
    expect(reads()).toBe(2);
    await advance(INVERTER_REFRESH_MS);
    expect(reads()).toBe(3);
  });

  it("UI-PLT-012 AC14 asks nothing while the document is hidden", async () => {
    await renderLoaded();

    setVisibility("hidden");
    await advance(3 * INVERTER_REFRESH_MS);

    expect(reads()).toBe(1);
  });

  it("UI-PLT-012 AC14 asks again as soon as the page is visible again", async () => {
    await renderLoaded();
    setVisibility("hidden");
    await advance(3 * INVERTER_REFRESH_MS);

    setVisibility("visible");
    await advance(0);

    expect(reads()).toBe(2);
  });

  it("UI-PLT-012 asks nothing before the plant is known", async () => {
    renderHookWithProviders(() => useInverterToday(undefined));
    await advance(2 * INVERTER_REFRESH_MS);

    expect(router.requests).toEqual([]);
  });
});
