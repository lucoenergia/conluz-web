import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildSupply } from "../../test/fixtures";
import { query } from "../../test/queryState";

vi.mock(import("../../api/supplies/supplies"), () => ({ useGetSupply: vi.fn() }));

import { getSupply, useGetSupply } from "../../api/supplies/supplies";
import { useSupplyInActiveCommunity } from "./useSupplyInActiveCommunity";

const ACTIVE = "community-a";

function httpError(status: number) {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: undefined,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const render = () =>
  renderHookWithProviders(() => useSupplyInActiveCommunity("supply-1"), {
    activeCommunityId: ACTIVE,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSupplyInActiveCommunity", () => {
  it("hands over a supply that belongs to the active community", () => {
    const supply = buildSupply({ community: { id: ACTIVE, name: "Sol" } });
    vi.mocked(useGetSupply).mockReturnValue(query.success<typeof getSupply>(supply));

    const { result } = render();

    expect(result.current.supply).toEqual(supply);
    expect(result.current.isNotFound).toBe(false);
  });

  // GET /supplies/{id} is authorised on membership, not on the selected
  // community, so this one answers 200 and has to be withheld here.
  it("withholds a supply from another of the user's communities, as not found", () => {
    vi.mocked(useGetSupply).mockReturnValue(
      query.success<typeof getSupply>(buildSupply({ community: { id: "community-b", name: "Otra" } })),
    );

    const { result } = render();

    expect(result.current.supply).toBeUndefined();
    expect(result.current.isNotFound).toBe(true);
  });

  it("reports a real 404 as not found too", () => {
    vi.mocked(useGetSupply).mockReturnValue(query.error(httpError(404)));

    const { result } = render();

    expect(result.current.isNotFound).toBe(true);
    // Masked: the page renders its own empty state, and surfacing the axios
    // error as well would raise an error toast behind it.
    expect(result.current.error).toBeNull();
  });

  it("passes a failure that is not a 404 straight through", () => {
    const error = httpError(500);
    vi.mocked(useGetSupply).mockReturnValue(query.error(error));

    const { result } = render();

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it("is neither found nor foreign while it is still loading", () => {
    vi.mocked(useGetSupply).mockReturnValue(query.loading());

    const { result } = render();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isNotFound).toBe(false);
  });
});
