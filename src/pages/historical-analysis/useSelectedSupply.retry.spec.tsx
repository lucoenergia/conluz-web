import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { useSearchParams } from "react-router";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { apiError } from "../../test/apiError";
import { routeRequests } from "../../test/requestRouter";
import { buildCommunity, buildCommunityCapabilities, buildCurrentUser } from "../../test/fixtures";
import type { CurrentUserResponse } from "../../api/models";

// Tier 2: the subject is the cache's retry behaviour, so the real community
// and supply hooks run against a mocked customInstance and the app's own query
// client, whose retry policy (UI-DATA-002, #327) is what keeps a refused or
// missing supply from being asked for again: that changes nothing and only
// delays the fallback to "Todos mis puntos" (#252).
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

import { createAppQueryClient } from "../../queryClient";
import { useSelectedSupply } from "./useSelectedSupply";
import { HOME } from "../../components/evolution/consumptionSeries.testData";
import { COMMUNITY_ID, OWNER_ID } from "./historicalAnalysis.testData";

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
    // Production's retry policy, without its delay, so a retry would show here at once.
    const queryClient = createAppQueryClient();
    const defaults = queryClient.getDefaultOptions();
    queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retryDelay: 0 } });

    const { result } = renderHookWithProviders(
      () => ({ selection: useSelectedSupply([HOME]), params: useSearchParams()[0] }),
      { route: `/historical-analysis?supplyId=${MISSING_ID}`, activeCommunityId: COMMUNITY_ID, queryClient },
    );

    await waitFor(() => expect(result.current.params.has("supplyId")).toBe(false));
    expect(result.current.selection.selected).toBeNull();
    expect(router.requests.filter((config) => config.url === SUPPLY_URL)).toHaveLength(1);
  });
});
