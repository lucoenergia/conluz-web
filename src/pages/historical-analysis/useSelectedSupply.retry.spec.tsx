import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { apiError } from "../../test/apiError";
import { routeRequests } from "../../test/requestRouter";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";
import type { CurrentUserResponse } from "../../api/models";

// Tier 2: the subject is the cache's retry behaviour, so the real community
// and supply hooks run against a mocked customInstance. Production keeps React
// Query's default of three retries (src/queryClient.ts); asking again for a
// supply that is refused or missing changes nothing and only delays the
// fallback to "Todos mis puntos" (#252).
const { mockCustomInstance } = vi.hoisted(() => ({ mockCustomInstance: vi.fn() }));

// Spread the original: the harness's AuthProvider uses AXIOS_INSTANCE from it.
vi.mock(import("../../http/custom-instance"), async (importOriginal) => ({
  ...(await importOriginal()),
  customInstance: (config) => mockCustomInstance(config),
}));

let mockLoggedUser: CurrentUserResponse;
vi.mock(import("../../context/logged-user.context"), async (importOriginal) => ({
  ...(await importOriginal()),
  useLoggedUser: () => mockLoggedUser,
}));

import { useSelectedSupply } from "./useSelectedSupply";
import { COMMUNITY_ID, HOME, OWNER_ID } from "./historicalAnalysis.testData";

const MISSING_ID = "missing-supply";
const SUPPLY_URL = `/api/v1/supplies/${MISSING_ID}`;

describe("UI-HIS-002 a refused or missing supply is not asked for again (#252)", () => {
  it.each([403, 404])("UI-HIS-002 a %i lookup is requested exactly once, with retries on as in production, and then falls back", async (status) => {
    mockLoggedUser = buildCurrentUser({ id: OWNER_ID, memberships: { [COMMUNITY_ID]: "COMMUNITY_ADMIN" } });
    const router = routeRequests([
      {
        method: "GET",
        url: `/api/v1/communities/${COMMUNITY_ID}`,
        respond: () => buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities({ canRead: true, canManage: true }) }),
      },
      {
        method: "GET",
        url: SUPPLY_URL,
        respond: () => {
          throw apiError(status);
        },
      },
    ]);
    mockCustomInstance.mockImplementation(router.handle);
    // Production's retry count, without its delay, so a retry would show here at once.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });

    const { result } = renderHookWithProviders(
      () => ({ selection: useSelectedSupply([HOME]), params: useSearchParams()[0] }),
      { route: `/historical-analysis?supplyId=${MISSING_ID}`, activeCommunityId: COMMUNITY_ID, queryClient },
    );

    await waitFor(() => expect(result.current.params.has("supplyId")).toBe(false));
    expect(result.current.selection.selected).toBeNull();
    expect(router.requests.filter((config) => config.url === SUPPLY_URL)).toHaveLength(1);
  });
});
