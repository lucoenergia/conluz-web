import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getGetAllPlantsQueryKey,
  getGetPlantByIdQueryKey,
  getGetPlantInverterProductionTodayQueryKey,
  getGetPlantSurplusClaimQueryKey,
  useDeletePlant,
  useUpdatePlant,
} from "../../api/plants/plants";
import {
  getGetHuaweiConfigQueryKey,
  useConfigureHuawei,
  useDisableHuaweiConfig,
  useEnableHuaweiConfig,
} from "../../api/production/production";
import {
  getGetSharingAgreementsQueryKey,
  useCreateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";
import { buildPlant, buildPlantCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { usePlantActions } from "./usePlantActions";
import { UpdatePlantBodyInverterProvider } from "../../api/models";
import { downloadPlantSurplusClaimFile } from "../../pages/production/surplusClaim/downloadPlantSurplusClaimFile";
import { triggerBrowserDownload } from "../../utils/triggerBrowserDownload";
import { apiError } from "../../test/apiError";

/** Complete bodies: a partial would hide a field the screen must supply. */
const UPDATE_PLANT_BODY = {
  providerCode: "TEST-PROVIDER-CODE",
  name: "TEST-PLANT-NAME",
  supplyCode: "TEST-SUPPLY-CODE",
  inverterProvider: UpdatePlantBodyInverterProvider.HUAWEI,
  address: "TEST-ADDRESS",
  peakPowerKWp: 90001,
  nominalPowerKW: 90003,
};
const HUAWEI_CONFIG_BODY = {
  username: "TEST-USERNAME",
  password: "TEST-PASSWORD",
  baseUrl: "https://test.invalid",
  enabled: true,
};
const CREATE_AGREEMENT_BODY = { name: "TEST-AGREEMENT-NAME", nominalPowerKW: 90002 };

vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdatePlant: vi.fn(),
  useDeletePlant: vi.fn(),
}));
vi.mock(import("../../api/production/production"), async (importOriginal) => ({
  ...(await importOriginal()),
  useConfigureHuawei: vi.fn(),
  useEnableHuaweiConfig: vi.fn(),
  useDisableHuaweiConfig: vi.fn(),
}));
vi.mock(import("../../pages/production/surplusClaim/downloadPlantSurplusClaimFile"), async (importOriginal) => ({
  ...(await importOriginal()),
  downloadPlantSurplusClaimFile: vi.fn(),
}));
vi.mock(import("../../utils/triggerBrowserDownload"), async (importOriginal) => ({
  ...(await importOriginal()),
  triggerBrowserDownload: vi.fn(),
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

let mutateAsync: Mock;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDeletePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureHuawei).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableHuaweiConfig).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableHuaweiConfig).mockReturnValue(mutation.idle({ mutateAsync }));
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

  // Huawei's endpoints are plant-scoped, so the plant's own canManage decides,
  // never a community's (#192).
  it("gates configureHuawei on the plant", () => {
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

  it("UI-SCL-010 reads every month of the plant's surplus claim again on edit, as it carries the plant's CIL", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.edit?.run(UPDATE_PLANT_BODY);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [`/api/v1/plants/${PLANT_ID}/surplus-claim`] });
    expect(getGetPlantSurplusClaimQueryKey(PLANT_ID)).toEqual([`/api/v1/plants/${PLANT_ID}/surplus-claim`]);
  });

  describe("the surplus claim download", () => {
    beforeEach(() => {
      vi.mocked(downloadPlantSurplusClaimFile).mockReset();
      vi.mocked(triggerBrowserDownload).mockReset();
    });

    it("hands it back under the plant's canManage, and withholds it otherwise", () => {
      expect(render(plantWith({ canManage: true })).result.current.actions.downloadSurplusClaim).toBeDefined();
      const denied = render(plantWith({ canListSharingAgreements: true })).result.current;
      expect(denied.actions.downloadSurplusClaim).toBeUndefined();
      expect(denied.outcomes.downloadSurplusClaim).toEqual({ state: "denied" });
    });

    it("UI-SCL-008 asks for the month and format given, and saves the file under the server's name", async () => {
      const blob = new Blob(["PK"]);
      vi.mocked(downloadPlantSurplusClaimFile).mockResolvedValue({ blob, filename: "excedentes_ES1_2026-10.csv" });
      const { result } = render(plantWith({ canManage: true }));

      expect(await result.current.actions.downloadSurplusClaim!.run("2026-10", "GENERIC")).toEqual({ ok: true });

      expect(downloadPlantSurplusClaimFile).toHaveBeenCalledWith(PLANT_ID, "2026-10", "GENERIC");
      expect(triggerBrowserDownload).toHaveBeenCalledWith(blob, "excedentes_ES1_2026-10.csv");
    });

    it("UI-SCL-010 hands back a refusal with its Blob body read, so its code can be told apart", async () => {
      const body = { status: 409, errors: [{ code: "SURPLUS_CLAIM_CIL_REQUIRED", message: "raw backend message" }] };
      const refusal = Object.assign(apiError(409), {
        response: { status: 409, headers: {}, data: new Blob([JSON.stringify(body)], { type: "application/json" }) },
      });
      vi.mocked(downloadPlantSurplusClaimFile).mockRejectedValue(refusal);
      const { result } = render(plantWith({ canManage: true }));

      const outcome = await result.current.actions.downloadSurplusClaim!.run("2026-10", "ENDESA");

      expect(outcome).toEqual({ error: expect.objectContaining({ response: expect.objectContaining({ data: body }) }) });
      expect(triggerBrowserDownload).not.toHaveBeenCalled();
    });
  });

  // Invalidating a deleted plant would refetch it and 404 straight after a
  // successful delete, which is why the existing agreement delete removes too.
  it("UI-PLT-014 removes the deleted plant from the cache rather than invalidating it, unless a screen still observes it", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.remove?.run()).resolves.toEqual({ ok: true });

    // Only an inactive one: the plant's own detail, deleting it, still observes
    // it until it navigates away, and would refetch a removed query into a 404.
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: getGetPlantByIdQueryKey(PLANT_ID), type: "inactive" });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: getGetPlantByIdQueryKey(PLANT_ID),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllPlantsQueryKey(COMMUNITY_ID) });
  });

  it("invalidates the Huawei config the screen reads back", async () => {
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.configureHuawei?.run(HUAWEI_CONFIG_BODY)).resolves.toEqual({ ok: true });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetHuaweiConfigQueryKey(PLANT_ID) });
  });

  it.each(["configureHuawei", "enableHuawei", "disableHuawei"] as const)(
    "UI-PLT-012 reads today's inverter production back after %s, since its availability follows the configuration",
    async (action) => {
      const { result, queryClient } = render(plantWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      const run = result.current.actions[action]?.run as ((body?: typeof HUAWEI_CONFIG_BODY) => Promise<unknown>) | undefined;
      await expect(run?.(HUAWEI_CONFIG_BODY)).resolves.toEqual({ ok: true });

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetPlantInverterProductionTodayQueryKey(PLANT_ID) });
      expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: getGetPlantInverterProductionTodayQueryKey("another-plant") });
    },
  );

  // The refusal itself, not false: the screen shows HUAWEI_CONFIG_PASSWORD_REQUIRED
  // on the password field, so it needs the error to read the code from (#192).
  it("hands back a refused Huawei write's error and leaves the cache alone", async () => {
    const refusal = new Error("refused");
    mutateAsync.mockRejectedValue(refusal);
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.configureHuawei?.run(HUAWEI_CONFIG_BODY)).resolves.toEqual({ error: refusal });
    expect(invalidateQueries).not.toHaveBeenCalled();
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

  it("UI-PLT-008 hands back the refusal and leaves the cache alone", async () => {
    const error = new Error("boom");
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render(plantWith({ canManage: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const removeQueries = vi.spyOn(queryClient, "removeQueries");

    await expect(result.current.actions.remove?.run()).resolves.toEqual({ error });
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(removeQueries).not.toHaveBeenCalled();
  });

  describe("the Huawei switch's actions", () => {
    // An opposite pair: both halves for a caller who may do either, and the
    // stored configuration's enabled picks the one that applies.
    it("UI-INT-009 hands back enableHuawei and disableHuawei together under the plant's canManage", () => {
      const allowed = render(plantWith({ canManage: true })).result;
      expect(allowed.current.actions.enableHuawei).toBeDefined();
      expect(allowed.current.actions.disableHuawei).toBeDefined();

      const denied = render(plantWith({ canManageSharingAgreements: true, canReadSupply: true })).result;
      expect(denied.current.actions.enableHuawei).toBeUndefined();
      expect(denied.current.actions.disableHuawei).toBeUndefined();
    });

    it("UI-INT-009 calls each endpoint with the plant id and no body", async () => {
      const { result } = render(plantWith({ canManage: true }));

      await expect(result.current.actions.enableHuawei?.run()).resolves.toEqual({ ok: true });
      expect(mutateAsync).toHaveBeenLastCalledWith({ plantId: PLANT_ID });
      await expect(result.current.actions.disableHuawei?.run()).resolves.toEqual({ ok: true });
      expect(mutateAsync).toHaveBeenLastCalledWith({ plantId: PLANT_ID });
    });

    it("UI-INT-005 refreshes only this plant's Huawei configuration", async () => {
      const { result, queryClient } = render(plantWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.enableHuawei?.run();
      await result.current.actions.disableHuawei?.run();

      // Its configuration, and today's inverter production that follows it (UI-PLT-012): this plant's only.
      expect(invalidateQueries.mock.calls).toEqual([
        [{ queryKey: getGetHuaweiConfigQueryKey(PLANT_ID) }],
        [{ queryKey: getGetPlantInverterProductionTodayQueryKey(PLANT_ID) }],
        [{ queryKey: getGetHuaweiConfigQueryKey(PLANT_ID) }],
        [{ queryKey: getGetPlantInverterProductionTodayQueryKey(PLANT_ID) }],
      ]);
    });

    it("UI-INT-010 hands back a refused enable's error, so its code can be read", async () => {
      const refusal = new Error("incomplete");
      mutateAsync.mockRejectedValue(refusal);
      const { result, queryClient } = render(plantWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.enableHuawei?.run()).resolves.toEqual({ error: refusal });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
