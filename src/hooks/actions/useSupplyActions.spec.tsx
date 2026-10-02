import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllSuppliesQueryKey,
  getGetSupplyQueryKey,
  useDisableSupply,
  useEnableSupply,
  useUpdateSupply,
} from "../../api/supplies/supplies";
import { getGetAllPlantsQueryKey, useCreatePlant } from "../../api/plants/plants";
import { buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useSupplyActions } from "./useSupplyActions";
import { UpdatePlantBodyInverterProvider } from "../../api/models";

/** Complete bodies: a partial would hide a field the screen must supply. */
const UPDATE_SUPPLY_BODY = {
  code: "TEST-SUPPLY-CODE",
  name: "TEST-SUPPLY-NAME",
  address: "TEST-ADDRESS",
  addressRef: "TEST-ADDRESS-REF",
};
const CREATE_PLANT_BODY = {
  providerCode: "TEST-PROVIDER-CODE",
  name: "TEST-PLANT-NAME",
  supplyCode: "TEST-SUPPLY-CODE",
  inverterProvider: UpdatePlantBodyInverterProvider.HUAWEI,
  address: "TEST-ADDRESS",
  totalPower: 90001,
};

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSupply: vi.fn(),
  useEnableSupply: vi.fn(),
  useDisableSupply: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";
const SUPPLY_ID = "TEST-SUPPLY-ID";

const supplyWith = (capabilities: Parameters<typeof buildSupplyCapabilities>[0]) =>
  buildSupply({ id: SUPPLY_ID, capabilities: buildSupplyCapabilities(capabilities) });

const render = (supply: ReturnType<typeof buildSupply> | undefined) =>
  renderHookWithProviders(() => useSupplyActions().forSupply(supply), {
    activeCommunityId: COMMUNITY_ID,
  });

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useSupplyActions", () => {
  it("withholds every action when the supply permits none", () => {
    const { result } = render(supplyWith({}));

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.actions.enable).toBeUndefined();
    expect(result.current.actions.disable).toBeUndefined();
    expect(result.current.actions.createPlant).toBeUndefined();
    expect(result.current.outcomes.edit).toEqual({ state: "denied" });
  });

  it("withholds every action and reports pending while the supply has not arrived", () => {
    const { result } = render(undefined);

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.outcomes.edit).toEqual({ state: "pending" });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // canEdit is one flag for three actions, by the backend's own doc. A screen
  // cannot offer edit without disable, and this records that rather than
  // inventing a distinction the API does not make.
  it("hands back edit, enable and disable together, because canEdit answers for all three", () => {
    const { result } = render(supplyWith({ canEdit: true }));

    expect(result.current.actions.edit).toBeDefined();
    expect(result.current.actions.enable).toBeDefined();
    expect(result.current.actions.disable).toBeDefined();
    // A different flag, so it must not come along.
    expect(result.current.actions.createPlant).toBeUndefined();
  });

  it("gates createPlant on the supply's own canCreatePlant, not on canEdit", () => {
    const { result } = render(supplyWith({ canCreatePlant: true }));

    expect(result.current.actions.createPlant).toBeDefined();
    expect(result.current.actions.edit).toBeUndefined();
  });

  it("calls the mutation with the supply id and body the screen supplies", async () => {
    const { result } = render(supplyWith({ canEdit: true }));

    await expect(result.current.actions.edit?.run(UPDATE_SUPPLY_BODY)).resolves.toBe(true);
    expect(mutateAsync).toHaveBeenCalledWith({ supplyId: SUPPLY_ID, data: UPDATE_SUPPLY_BODY });
  });

  it("invalidates the supply and the community's supply list", async () => {
    const { result, queryClient } = render(supplyWith({ canEdit: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.disable?.run();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID) });
    // No params, so the key is a prefix and every page and filter variant matches.
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID),
    });
  });

  it("refreshes the plant list too when a plant is created from the supply", async () => {
    mutateAsync.mockResolvedValue({ id: "TEST-PLANT-ID" });
    const { result, queryClient } = render(supplyWith({ canCreatePlant: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.createPlant?.run(CREATE_PLANT_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetAllPlantsQueryKey(COMMUNITY_ID),
    });
  });

  it("reports failure and leaves the cache alone", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = render(supplyWith({ canEdit: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.edit?.run(UPDATE_SUPPLY_BODY)).resolves.toBe(false);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("carries each mutation's own pending flag", () => {
    vi.mocked(useDisableSupply).mockReturnValue(
      mutation.pending({ supplyId: SUPPLY_ID }, { mutateAsync }),
    );
    const { result } = render(supplyWith({ canEdit: true }));

    expect(result.current.actions.disable?.isPending).toBe(true);
    expect(result.current.actions.enable?.isPending).toBe(false);
  });
});
