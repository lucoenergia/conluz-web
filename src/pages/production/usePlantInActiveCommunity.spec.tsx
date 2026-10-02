import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildPlant } from "../../test/fixtures";
import { query } from "../../test/queryState";

vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useGetPlantById: vi.fn(),
}));

import { getPlantById, useGetPlantById } from "../../api/plants/plants";
import { usePlantInActiveCommunity } from "./usePlantInActiveCommunity";

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
  renderHookWithProviders(() => usePlantInActiveCommunity("plant-1"), { activeCommunityId: ACTIVE });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlantInActiveCommunity", () => {
  it("hands over a plant that belongs to the active community", () => {
    const plant = buildPlant({ community: { id: ACTIVE } });
    vi.mocked(useGetPlantById).mockReturnValue(query.success<typeof getPlantById>(plant));

    const { result } = render();

    expect(result.current.plant).toEqual(plant);
    expect(result.current.isNotFound).toBe(false);
  });

  // GET /plants/{id} is authorised on membership, not on the selected
  // community, so this one answers 200 and has to be withheld here.
  it("withholds a plant from another of the user's communities, as not found", () => {
    vi.mocked(useGetPlantById).mockReturnValue(
      query.success<typeof getPlantById>(buildPlant({ community: { id: "community-b" } })),
    );

    const { result } = render();

    expect(result.current.plant).toBeUndefined();
    expect(result.current.isNotFound).toBe(true);
  });

  it("reports a real 404 as not found too", () => {
    vi.mocked(useGetPlantById).mockReturnValue(query.error(httpError(404)));

    const { result } = render();

    expect(result.current.isNotFound).toBe(true);
    // Masked: the page renders its own empty state, and surfacing the axios
    // error as well would raise an error toast behind it.
    expect(result.current.error).toBeNull();
  });

  it("passes a failure that is not a 404 straight through", () => {
    const error = httpError(500);
    vi.mocked(useGetPlantById).mockReturnValue(query.error(error));

    const { result } = render();

    expect(result.current.isNotFound).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it("is neither found nor foreign while it is still loading", () => {
    vi.mocked(useGetPlantById).mockReturnValue(query.loading());

    const { result } = render();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isNotFound).toBe(false);
  });
});
