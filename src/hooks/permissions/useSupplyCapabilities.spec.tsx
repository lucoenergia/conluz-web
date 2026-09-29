import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import type { SupplyCapabilitiesResponse, SupplyResponse } from "../../api/models";

vi.mock(import("../../pages/supply-points/useSupplyInActiveCommunity"), () => ({
  useSupplyInActiveCommunity: vi.fn(),
}));

import { useSupplyInActiveCommunity } from "../../pages/supply-points/useSupplyInActiveCommunity";
import { useSupplyCapabilities } from "./useSupplyCapabilities";

const SUPPLY_ID = "supply-1";
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

/** The wrapper's shape: a settled supply, a not-found, or a failure. */
function wrapperReturns(overrides: {
  supply?: SupplyResponse;
  isLoading?: boolean;
  isNotFound?: boolean;
  error?: unknown;
}) {
  vi.mocked(useSupplyInActiveCommunity).mockReturnValue({
    supply: undefined,
    isLoading: false,
    isNotFound: false,
    error: null,
    refetch,
    ...overrides,
  });
}

function renderWith(
  capability: keyof SupplyCapabilitiesResponse = "canEdit",
  options: { enabled?: boolean; supplyId?: string | undefined } = {},
) {
  const { enabled = true } = options;
  // Not a destructuring default: `{ supplyId: undefined }` would fall back to
  // it, and the point of that case is to pass no supply id at all.
  const supplyId = "supplyId" in options ? options.supplyId : SUPPLY_ID;
  return renderHookWithProviders(() => useSupplyCapabilities(supplyId, capability, { enabled }), {
    activeCommunityId: "community-A",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSupplyCapabilities", () => {
  it("allows when the capability is true", () => {
    wrapperReturns({
      supply: buildSupply({ capabilities: buildSupplyCapabilities({ canEdit: true }) }),
    });
    expect(renderWith().result.current).toEqual({ state: "allowed" });
  });

  it("denies when the capability is false", () => {
    wrapperReturns({
      supply: buildSupply({ capabilities: buildSupplyCapabilities({ canEdit: false }) }),
    });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("denies when the capability is absent from the payload", () => {
    wrapperReturns({ supply: buildSupply({ capabilities: {} as SupplyCapabilitiesResponse }) });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("is pending while the supply is being fetched", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith().result.current).toEqual({ state: "pending" });
  });

  // The wrapper folds "no such supply" and "a supply in another community" into
  // one answer. Both are denials: a deep link to either must redirect rather
  // than hang waiting for a supply that is never going to arrive.
  it("denies a missing or foreign supply", () => {
    wrapperReturns({ isNotFound: true });
    expect(renderWith().result.current).toEqual({ state: "denied" });
  });

  it("reports an error, not a denial, when the supply fails to load", () => {
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
  // stable, so the supply resolver runs on routes that have no supply. It must
  // not fire a request for one.
  it("denies and fetches nothing when disabled", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith("canEdit", { enabled: false }).result.current).toEqual({ state: "denied" });
    expect(vi.mocked(useSupplyInActiveCommunity)).toHaveBeenCalledWith("");
  });

  it("denies and fetches nothing when there is no supply id", () => {
    wrapperReturns({ isLoading: true });
    expect(renderWith("canEdit", { supplyId: undefined }).result.current).toEqual({
      state: "denied",
    });
    expect(vi.mocked(useSupplyInActiveCommunity)).toHaveBeenCalledWith("");
  });

  // The owner reads their own coefficients but may not change the supply, so
  // these two must never be answered from the same flag.
  it("reads the capability it was asked for, not another one", () => {
    wrapperReturns({
      supply: buildSupply({
        capabilities: buildSupplyCapabilities({ canReadPartitionCoefficients: true, canEdit: false }),
      }),
    });
    expect(renderWith("canReadPartitionCoefficients").result.current).toEqual({ state: "allowed" });
    expect(renderWith("canEdit").result.current).toEqual({ state: "denied" });
  });
});
