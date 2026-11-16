import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getGetAllSuppliesQueryKey,
  getGetSupplyQueryKey,
  useDeleteSupply,
  useDisableSupply,
  useEnableSupply,
  useTransferSupplyOwnership,
  useUpdateSupply,
} from "../../api/supplies/supplies";
import { getGetAllPlantsQueryKey, useCreatePlant } from "../../api/plants/plants";
import { getGetSuppliesByUserIdQueryKey } from "../../api/users/users";
import { getGetAllCommunitiesQueryKey, getGetCommunityByIdQueryKey } from "../../api/communities/communities";
import {
  getGetMembershipDailyConsumptionQueryKey,
  getGetMembershipEnergyMetricsQueryKey,
  getGetMembershipHourlyConsumptionQueryKey,
  getGetMembershipHourlyProfileQueryKey,
  getGetMembershipMonthlyConsumptionQueryKey,
  getGetMembershipPaybackQueryKey,
} from "../../api/memberships/memberships";
import { apiError } from "../../test/apiError";
import { buildMembership, buildSupply, buildSupplyCapabilities } from "../../test/fixtures";
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
  peakPowerKWp: 90001,
  nominalPowerKW: 90003,
};

vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateSupply: vi.fn(),
  useEnableSupply: vi.fn(),
  useDisableSupply: vi.fn(),
  useDeleteSupply: vi.fn(),
  useTransferSupplyOwnership: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";
const SUPPLY_ID = "TEST-SUPPLY-ID";

const OWNER_ID = "TEST-OWNER-ID";

const supplyWith = (capabilities: Parameters<typeof buildSupplyCapabilities>[0]) =>
  buildSupply({
    id: SUPPLY_ID,
    user: { id: OWNER_ID },
    capabilities: buildSupplyCapabilities(capabilities),
  });

const render = (supply: ReturnType<typeof buildSupply> | undefined) =>
  renderHookWithProviders(() => useSupplyActions().forSupply(supply), {
    activeCommunityId: COMMUNITY_ID,
  });

let mutateAsync: Mock;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDeleteSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useTransferSupplyOwnership).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("useSupplyActions", () => {
  it("withholds every action when the supply permits none", () => {
    const { result } = render(supplyWith({}));

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.actions.enable).toBeUndefined();
    expect(result.current.actions.disable).toBeUndefined();
    expect(result.current.actions.createPlant).toBeUndefined();
    expect(result.current.actions.remove).toBeUndefined();
    expect(result.current.actions.transferOwnership).toBeUndefined();
    expect(result.current.outcomes.edit).toEqual({ state: "denied" });
    expect(result.current.outcomes.remove).toEqual({ state: "denied" });
    expect(result.current.outcomes.transferOwnership).toEqual({ state: "denied" });
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

    await expect(result.current.actions.edit?.run(UPDATE_SUPPLY_BODY)).resolves.toEqual({ ok: true });
    expect(mutateAsync).toHaveBeenCalledWith({ supplyId: SUPPLY_ID, data: UPDATE_SUPPLY_BODY });
  });

  it("invalidates the supply, the community's supply list and its owner's supplies", async () => {
    const { result, queryClient } = render(supplyWith({ canEdit: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.disable?.run();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID) });
    // No params, so the key is a prefix and every page and filter variant matches.
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID),
    });
    // The member's supplies reached from the members screen (?personId=).
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetSuppliesByUserIdQueryKey(OWNER_ID),
    });
  });

  it("invalidates no user's supplies for a supply with no owner", async () => {
    const { result, queryClient } = render(
      buildSupply({ id: SUPPLY_ID, user: null, capabilities: buildSupplyCapabilities({ canEdit: true }) }),
    );
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.disable?.run();

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
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

  it("hands back the refusal of an edit and leaves the cache alone", async () => {
    const refusal = new Error("boom");
    mutateAsync.mockRejectedValue(refusal);
    const { result, queryClient } = render(supplyWith({ canEdit: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.edit?.run(UPDATE_SUPPLY_BODY)).resolves.toEqual({ error: refusal });
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

  describe("remove", () => {
    it("UI-SUP-001 is handed back only for the supply's own canDelete", () => {
      expect(render(supplyWith({ canDelete: true })).result.current.actions.remove).toBeDefined();
      // canEdit answers for edit, enable and disable, never for delete.
      expect(render(supplyWith({ canEdit: true })).result.current.actions.remove).toBeUndefined();
    });

    it("UI-SUP-001 is withheld from a backend that does not report canDelete", () => {
      // A backend without lucoenergia/conluz#412 sends no canDelete at all.
      const capabilities = buildSupplyCapabilities({ canEdit: true });
      delete (capabilities as Partial<typeof capabilities>).canDelete;
      const { result } = render(buildSupply({ id: SUPPLY_ID, capabilities }));

      expect(result.current.actions.remove).toBeUndefined();
      expect(result.current.outcomes.remove).toEqual({ state: "denied" });
    });

    it("sends the supply's id", async () => {
      const { result } = render(supplyWith({ canDelete: true }));

      await expect(result.current.actions.remove?.run()).resolves.toEqual({ ok: true });
      expect(mutateAsync).toHaveBeenCalledWith({ supplyId: SUPPLY_ID });
    });

    it("UI-SUP-003 removes the supply and refreshes every read that names or counts it", async () => {
      const { result, queryClient } = render(supplyWith({ canDelete: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      const removeQueries = vi.spyOn(queryClient, "removeQueries");

      await result.current.actions.remove?.run();

      // Never refetched: that could only answer 404. Dropped where nobody reads
      // it; only marked stale where the detail page, which is leaving, does.
      expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID), type: "inactive" });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetSupplyQueryKey(SUPPLY_ID),
        refetchType: "none",
      });
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID) });
      for (const queryKey of [
        getGetAllSuppliesQueryKey(COMMUNITY_ID),
        getGetSuppliesByUserIdQueryKey(OWNER_ID),
        getGetAllCommunitiesQueryKey(),
        getGetCommunityByIdQueryKey(COMMUNITY_ID),
        getGetMembershipEnergyMetricsQueryKey(COMMUNITY_ID, OWNER_ID),
        getGetMembershipMonthlyConsumptionQueryKey(COMMUNITY_ID, OWNER_ID),
      ]) {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
      }
    });

    it("UI-SUP-004 hands back a 409 and leaves the cache alone, so the supply stays", async () => {
      const error = apiError(409, { code: "SUPPLY_HAS_PLANTS" });
      mutateAsync.mockRejectedValue(error);
      const { result, queryClient } = render(supplyWith({ canDelete: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      const removeQueries = vi.spyOn(queryClient, "removeQueries");

      await expect(result.current.actions.remove?.run()).resolves.toEqual({ error });
      expect(invalidateQueries).not.toHaveBeenCalled();
      expect(removeQueries).not.toHaveBeenCalled();
    });

    it("UI-SUP-004 hands back a 404 and refreshes the reads, because the supply is already gone", async () => {
      const error = apiError(404);
      mutateAsync.mockRejectedValue(error);
      const { result, queryClient } = render(supplyWith({ canDelete: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
      const removeQueries = vi.spyOn(queryClient, "removeQueries");

      await expect(result.current.actions.remove?.run()).resolves.toEqual({ error });
      expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID), type: "inactive" });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID) });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetSuppliesByUserIdQueryKey(OWNER_ID) });
    });
  });

  describe("transferOwnership", () => {
    const NEW_OWNER = buildMembership({ id: "TEST-NEW-MEMBERSHIP-ID", user: { id: "TEST-NEW-OWNER-ID" }, personalId: "TEST-NEW-PERSONAL-ID" });
    const REQUEST = { newOwner: NEW_OWNER, effectiveDate: "2026-03-01" };

    it("UI-SUP-024 is handed back only for the supply's own canTransferOwnership", () => {
      // canEdit and canDelete are other answers: a community admin holds them
      // too, but they do not stand in for this one.
      expect(render(supplyWith({ canEdit: true, canDelete: true })).result.current.actions.transferOwnership).toBeUndefined();

      const { result } = render(supplyWith({ canTransferOwnership: true }));
      expect(result.current.actions.transferOwnership).toBeDefined();
      expect(result.current.outcomes.transferOwnership).toEqual({ state: "allowed" });
      expect(result.current.actions.edit).toBeUndefined();
    });

    it("sends the new owner's personal ID and the effective date, and hands back the transferred supply", async () => {
      const transferred = buildSupply({ id: SUPPLY_ID, user: { id: NEW_OWNER.user.id } });
      mutateAsync.mockResolvedValue(transferred);
      const { result } = render(supplyWith({ canTransferOwnership: true }));

      await expect(result.current.actions.transferOwnership?.run(REQUEST)).resolves.toEqual({ ok: true, supply: transferred });
      expect(mutateAsync).toHaveBeenCalledWith({
        supplyId: SUPPLY_ID,
        data: { newOwnerPersonalId: "TEST-NEW-PERSONAL-ID", effectiveDate: "2026-03-01" },
      });
    });

    it.each([
      ["previous", OWNER_ID],
      ["new", "TEST-NEW-OWNER-ID"],
    ])("UI-SUP-028 refreshes every read of the %s owner's supplies and figures", async (_, ownerId) => {
      const { result, queryClient } = render(supplyWith({ canTransferOwnership: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.transferOwnership?.run(REQUEST);

      for (const queryKey of [
        getGetSuppliesByUserIdQueryKey(ownerId),
        // Prefixes over every period.
        getGetMembershipEnergyMetricsQueryKey(COMMUNITY_ID, ownerId),
        getGetMembershipMonthlyConsumptionQueryKey(COMMUNITY_ID, ownerId),
        getGetMembershipDailyConsumptionQueryKey(COMMUNITY_ID, ownerId),
        getGetMembershipHourlyConsumptionQueryKey(COMMUNITY_ID, ownerId),
        getGetMembershipHourlyProfileQueryKey(COMMUNITY_ID, ownerId),
        getGetMembershipPaybackQueryKey(COMMUNITY_ID, ownerId),
      ]) {
        expect(invalidateQueries).toHaveBeenCalledWith({ queryKey });
      }
    });

    it("UI-SUP-028 refreshes the supply and the community's supply list", async () => {
      const { result, queryClient } = render(supplyWith({ canTransferOwnership: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.transferOwnership?.run(REQUEST);

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetSupplyQueryKey(SUPPLY_ID) });
      // No params, so the key is a prefix and every page and filter variant matches.
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID) });
    });

    it("UI-SUP-028 refreshes only the new owner's reads for a supply that had no owner", async () => {
      const { result, queryClient } = render(
        buildSupply({ id: SUPPLY_ID, user: null, capabilities: buildSupplyCapabilities({ canTransferOwnership: true }) }),
      );
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.transferOwnership?.run(REQUEST);

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetSuppliesByUserIdQueryKey("TEST-NEW-OWNER-ID") });
      // The supply, the community's list, and seven reads of the new owner.
      expect(invalidateQueries).toHaveBeenCalledTimes(9);
    });

    it("hands back the refusal and leaves the cache alone", async () => {
      const refusal = apiError(409, { code: "SUPPLY_ALREADY_OWNED_BY_USER" });
      mutateAsync.mockRejectedValue(refusal);
      const { result, queryClient } = render(supplyWith({ canTransferOwnership: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.transferOwnership?.run(REQUEST)).resolves.toEqual({ error: refusal });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
