import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { routeRequests } from "../../test/requestRouter";

// Tier 2: the subject is whether a request leaves at all, so the real
// generated hook runs against a mocked customInstance.
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from it.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";

describe("UI-DATA-001 an empty supply id requests nothing", () => {
  it("UI-DATA-001 useSupplyInActiveCommunity issues no request when given an empty id", async () => {
    const router = routeRequests([]);
    mockCustomInstance.mockImplementation(router.handle);

    renderHookWithProviders(() => useSupplyInActiveCommunity(""), { activeCommunityId: "community-a" });
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(router.requests).toEqual([]);
  });
});
