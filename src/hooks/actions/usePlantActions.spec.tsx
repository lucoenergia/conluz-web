import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllPlantsQueryKey,
  getGetPlantByIdQueryKey,
  useDeletePlant,
  useUpdatePlant,
} from "../../api/plants/plants";
import { getGetHuaweiConfigQueryKey, useConfigureHuawei } from "../../api/production/production";
import {
  getGetSharingAgreementsQueryKey,
  useCreateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { usePlantActions } from "./usePlantActions";
import { UpdatePlantBodyInverterProvider } from "../../api/models";

/** Complete bodies: a partial would hide a field the screen must supply. */
const UPDATE_PLANT_BODY = {
  providerCode: "TEST-PROVIDER-CODE",
  name: "TEST-PLANT-NAME",
  supplyCode: "TEST-SUPPLY-CODE",
  inverterProvider: UpdatePlantBodyInverterProvider.HUAWEI,
  address: "TEST-ADDRESS",
  totalPower: 90001,
};
const HUAWEI_CONFIG_BODY = {
  username: "TEST-USERNAME",
  password: "TEST-PASSWORD",
  baseUrl: "https://test.invalid",
  enabled: true,
};
const CREATE_AGREEMENT_BODY = { name: "TEST-AGREEMENT-NAME", installedPowerKw: 90002 };

vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdatePlant: vi.fn(),
  useDeletePlant: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useConfigureHuawei: vi.fn(),
}));
vi.mock(import("../../api/sharing-agreements/sharing-agreements"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSharingAgreement: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";
const PLANT_ID = "TEST-PLANT-ID";

const plantWith = (capabilities: Parameters<typeof buildPlantCapabilities>[0]) =>
  buildPlant({ id: PLANT_ID, capabilities: buildPlantCapabilities(capabilities) });

const render = (plant: ReturnType<typeof buildPlant> | undefined) =>
  renderHookWithProviders(() => usePlantActions().forPlant(plant), {
    activeCommunityId: COMMUNITY_ID,
  });

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDeletePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureHuawei).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateSharingAgreement).mockReturnValue(mutation.idle({ mutateAsync }));
});

describe("usePlantActions", () => {
  it("withholds every action when the plant permits none", () => {
    const { result } = render(plantWith({}));

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.actions.remove).toBeUndefined();
    expect(result.current.actions.configureHuawei).toBeUndefined();
    expect(result.current.actions.createSharingAgreement).toBeUndefined();
    expect(result.current.outcomes.remove).toEqual({ state: "denied" });
  });

  it("withholds every action and reports pending while the plant has not arrived", () => {
    const { result } = render(undefined);

    expect(result.current.actions.edit).toBeUndefined();
    expect(result.current.outcomes.edit).toEqual({ state: "pending" });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  // canManage's doc covers "update or delete this plant, and read and write its
  // Huawei configuration" -- one answer for three actions.
  it("hands back edit, remove and configureHuawei together under canManage", () => {
    const { result } = render(plantWith({ canManage: true }));

    expect(result.current.actions.edit).toBeDefined();
    expect(result.current.actions.remove).toBeDefined();
    expect(result.current.actions.configureHuawei).toBeDefined();
    expect(result.current.actions.createSharingAgreement).toBeUndefined();
  });

  // The integrations screen shows the Huawei form beside Datadis and Shelly, but
  // its endpoint is plant-scoped, so it cannot share the community's gate.
  it("gates configureHuawei on the plant even though the screen groups it with the community's integrations", () => {
    const denied = render(plantWith({})).result;
    expect(denied.current.actions.configureHuawei).toBeUndefined();

    const allowed = render(plantWith({ canManage: true })).result;
    expect(allowed.current.actions.configureHuawei).toBeDefined();
  });

  it("gates createSharingAgreement on its own flag", () => {
    const { result } = render(plantWith({ canManageSharingAgreements: true }));

    expect(result.current.actions.createSharingAgreement).toBeDefined();
    expect(result.current.actions.edit).toBeUndefined();
  });

  it("calls each mutation with the plant id and body the screen supplies", async () => {
    const { result } = render(plantWith({ canManage: true }));

    await result.current.actions.edit?.run(UPDATE_PLANT_BODY);
    expect(mutateAsync).toHaveBeenCalledWith({ plantId: PLANT_ID, data: UPDATE_PLANT_BODY });

    await result.current.actions.configureHuawei?.run(HUAWEI_CONFIG_BODY);
    expect(mutateAsync).toHaveBeenCalledWith({ plantId: PLANT_ID, data: HUAWEI_CONFIG_BODY });
  });

  it("invalidates the plant and the community's plant list on edit", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.edit?.run(UPDATE_PLANT_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlantByIdQueryKey(PLANT_ID) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllPlantsQueryKey(COMMUNITY_ID) });
  });

  // Invalidating a deleted plant would refetch it and 404 straight after a
  // successful delete, which is why the existing agreement delete removes too.
  it("removes the deleted plant from the cache rather than invalidating it", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.remove?.run();

    expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetPlantByIdQueryKey(PLANT_ID) });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: getGetPlantByIdQueryKey(PLANT_ID),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllPlantsQueryKey(COMMUNITY_ID) });
  });

  it("invalidates the Huawei config the screen reads back", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.configureHuawei?.run(HUAWEI_CONFIG_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_ID) });
  });

  it("invalidates the agreement list and returns the created agreement", async () => {
    mutateAsync.mockResolvedValue({ id: "TEST-AGREEMENT-ID" });
    const { result, queryClient } = render(plantWith({ canManageSharingAgreements: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(
      result.current.actions.createSharingAgreement?.run(CREATE_AGREEMENT_BODY),
    ).resolves.toEqual({ id: "TEST-AGREEMENT-ID" });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetSharingAgreementsQueryKey(PLANT_ID),
    });
  });

  it("reports failure and leaves the cache alone", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.remove?.run()).resolves.toBe(false);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
