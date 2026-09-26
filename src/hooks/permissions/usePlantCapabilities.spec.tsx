import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import type { PlantCapabilitiesResponse, PlantResponse } from "../../api/models";

vi.mock(import("../../pages/production/usePlantInActiveCommunity"), () => ({
  usePlantInActiveCommunity: vi.fn(),
}));

import { usePlantInActiveCommunity } from "../../pages/production/usePlantInActiveCommunity";
import { usePlantCapabilities } from "./usePlantCapabilities";

const PLANT_ID = "plant-1";
const refetch = vi.fn();

function httpError(status: number) {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    statusText: "",
    data: undefined,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

/** The wrapper's shape: a settled plant, a not-found, or a failure. */
function wrapperReturns(overrides: {
  plant?: PlantResponse;
  isLoading?: boolean;
  isNotFound?: boolean;
  error?: unknown;
}) {
  vi.mocked(usePlantInActiveCommunity).mockReturnValue({
    plant: undefined,
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch,
    ...overrides,
  });
}

function renderWith(
  capability: keyof PlantCapabilitiesResponse = "canListSharingAgreements",
  options: { enabled?: boolean; plantId?: string | undefined } = {},
) {
  const { enabled = true } = options;
  // Not a destructuring default: `{ plantId: undefined }` would fall back to it,
  // and the point of that case is to pass no plant id at all.
  const plantId = "plantId" in options ? options.plantId : PLANT_ID;
  return renderHookWithProviders(() => usePlantCapabilities(plantId, capability, { enabled }), {
    activeCommunityId: "community-A",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlantCapabilities", () => {
  it("allows when the capability is true", () => {
    wrapperReturns({
      plant: buildPlant({ capabilities: buildPlantCapabilities({ canListSharingAgreements: true }) }),
    });
    expect(renderWith().result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    wrapperReturns({
      plant: buildPlant({ capabilities: buildPlantCapabilities({ canListSharingAgreements: false }) }),
    });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("denies when the capability is absent from the payload", () => {
    wrapperReturns({ plant: buildPlant({ capabilities: {} as PlantCapabilitiesResponse }) });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("is pending while the plant is being fetched", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith().result.current).toEqual({ state: "pending" });
  });

  // The wrapper folds "no such plant" and "a plant in another community" into
  // one answer. Both are denials: a deep link to either must redirect rather
  // than hang waiting for a plant that is never going to arrive.
  it("denies a missing or foreign plant", () => {
    wrapperReturns({ isNotFound: true });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("reports an error, not a denial, when the plant fails to load", () => {
    wrapperReturns({ error: httpError(500) });
    expect(renderWith().result.current).toMatchObject({ state: "error" });
  });

  it("offers a retry that refetches", () => {
    wrapperReturns({ error: httpError(500) });
    const outcome = renderWith().result.current;
    if (outcome.state !== "error") throw new Error(`expected an error outcome, got ${outcome.state}`);

    outcome.retry();
    expect(refetch).toHaveBeenCalledOnce();
  });

  // A route guard resolves every scope on every render to keep the hook order
  // stable, so the plant resolver runs on routes that have no plant. It must
  // not fire a request for one.
  it("denies and fetches nothing when disabled", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith("canListSharingAgreements", { enabled: false }).result.current).toEqual({
      state: "denied",
    });
    expect(vi.mocked(usePlantInActiveCommunity)).toHaveBeenCalledWith("");
  });

  it("denies and fetches nothing when there is no plant id", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith("canListSharingAgreements", { plantId: undefined }).result.current).toEqual({
      state: "denied",
    });
    expect(vi.mocked(usePlantInActiveCommunity)).toHaveBeenCalledWith("");
  });

  it("reads the capability it was asked for, not another one", () => {
    wrapperReturns({
      plant: buildPlant({
        capabilities: buildPlantCapabilities({ canListSharingAgreements: true, canManage: false }),
      }),
    });
    expect(renderWith("canManage").result.current).toEqual({ state: "denied" });
  });
});
