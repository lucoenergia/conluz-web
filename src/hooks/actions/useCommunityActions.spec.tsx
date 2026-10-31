import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllCommunitiesQueryKey,
  getGetCommunityByIdQueryKey,
  getGetCommunityContactQueryKey,
  useDisableCommunity,
  useEnableCommunity,
  useSetCommunityContact,
  useUpdateCommunity,
} from "../../api/communities/communities";
import {
  getGetAllSuppliesQueryKey,
  useImportSupplies,
  useCreateSupply,
} from "../../api/supplies/supplies";
import { useCreatePlant } from "../../api/plants/plants";
import {
  getGetDatadisConfigQueryKey,
  getGetShellyConfigQueryKey,
  useConfigureDatadis,
  useConfigureShelly,
  useDisableDatadisConfig,
  useEnableDatadisConfig,
} from "../../api/consumption/consumption";
import { buildCommunity, buildCommunityCapabilities } from "../../test/fixtures";
import { mutation } from "../../test/queryState";
import { renderHookWithProviders } from "../../test/renderWithProviders";
import { useCommunityActions } from "./useCommunityActions";

/** Complete bodies: a cast would hide a field the screen must supply. */
const IMPORT_BODY = { file: new Blob(["TEST-CSV"]) };
const CREATE_SUPPLY_BODY = {
  code: "TEST-SUPPLY-CODE",
  personalId: "TEST-PERSONAL-ID",
  address: "TEST-ADDRESS",
  addressRef: "TEST-ADDRESS-REF",
  communityId: "TEST-COMMUNITY-ID",
};
const DATADIS_BODY = {
  username: "TEST-USERNAME",
  password: "TEST-PASSWORD",
  baseUrl: "https://test.invalid",
  enabled: true,
};
const SHELLY_BODY = { enabled: true };

vi.mock(import("../../api/communities/communities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useUpdateCommunity: vi.fn(),
  useEnableCommunity: vi.fn(),
  useDisableCommunity: vi.fn(),
  useSetCommunityContact: vi.fn(),
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSupply: vi.fn(),
  useImportSupplies: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));
vi.mock(import("../../api/consumption/consumption"), async (importOriginal) => ({
  ...(await importOriginal()),
  useConfigureDatadis: vi.fn(),
  useConfigureShelly: vi.fn(),
  useEnableDatadisConfig: vi.fn(),
  useDisableDatadisConfig: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";

const communityWith = (capabilities: Parameters<typeof buildCommunityCapabilities>[0]) =>
  buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) });

const render = (community: ReturnType<typeof buildCommunity> | undefined) =>
  renderHookWithProviders(() => useCommunityActions().forCommunity(community));

let mutateAsync: ReturnType<typeof vi.fn>;
let enableDatadis: ReturnType<typeof vi.fn>;
let disableDatadis: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useSetCommunityContact).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useImportSupplies).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureShelly).mockReturnValue(mutation.idle({ mutateAsync }));
  enableDatadis = vi.fn().mockResolvedValue(undefined);
  disableDatadis = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useEnableDatadisConfig).mockReturnValue(mutation.idle({ mutateAsync: enableDatadis }));
  vi.mocked(useDisableDatadisConfig).mockReturnValue(mutation.idle({ mutateAsync: disableDatadis }));
});

describe("useCommunityActions", () => {
  it("withholds every action when the community permits none", () => {
    const { result } = render(communityWith({}));

    for (const action of Object.values(result.current.actions)) expect(action).toBeUndefined();
    expect(result.current.outcomes.update).toEqual({ state: "denied" });
  });

  it("withholds every action and reports pending while the community has not arrived", () => {
    const { result } = render(undefined);

    expect(result.current.actions.update).toBeUndefined();
    expect(result.current.outcomes.update).toEqual({ state: "pending" });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("gates the lifecycle actions on their own separate flags", () => {
    const { result } = render(communityWith({ canEnable: true }));

    expect(result.current.actions.enable).toBeDefined();
    expect(result.current.actions.disable).toBeUndefined();
    expect(result.current.actions.update).toBeUndefined();
  });

  // Reading the active community instead would answer about the wrong one on the
  // communities list, where the caller manages a community they are not in.
  it("answers about the community it was handed, not the active one", async () => {
    const other = buildCommunity({
      id: "OTHER-COMMUNITY-ID",
      capabilities: buildCommunityCapabilities({ canUpdate: true }),
    });
    const { result } = renderHookWithProviders(() => useCommunityActions().forCommunity(other), {
      activeCommunityId: COMMUNITY_ID,
    });

    await result.current.actions.update?.run({ name: "TEST-COMMUNITY-NAME", code: "TEST-CODE" });

    expect(mutateAsync).toHaveBeenCalledWith({
      communityId: "OTHER-COMMUNITY-ID",
      data: { name: "TEST-COMMUNITY-NAME", code: "TEST-CODE" },
    });
  });

  it("invalidates the community and the community list on a lifecycle change", async () => {
    const { result, queryClient } = render(communityWith({ canDisable: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await result.current.actions.disable?.run();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getGetCommunityByIdQueryKey(COMMUNITY_ID),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllCommunitiesQueryKey() });
  });

  describe("the creations that have no resource of their own", () => {
    // There is no canCreateSupplies, unlike the sibling canCreatePlants.
    // canManage's own doc names "creating and importing its supplies", so it is
    // the backend's stated umbrella rather than a guess -- and it must not leak
    // a grant to the flag that does exist.
    it("gates creating and importing supplies on canManage, for want of a narrower flag", () => {
      const { result } = render(communityWith({ canManage: true }));

      expect(result.current.actions.createSupply).toBeDefined();
      expect(result.current.actions.importSupplies).toBeDefined();
      expect(result.current.actions.createPlant).toBeUndefined();
    });

    it("scopes a supply import to the community it was handed", async () => {
      const { result } = render(communityWith({ canManage: true }));

      await result.current.actions.importSupplies?.run(IMPORT_BODY);

      // The screen used to pass this itself, from the active community, which
      // is a second place the target could be decided -- and disagree.
      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, data: IMPORT_BODY });
    });

    it("hands back the result of a supply import and refreshes the supplies", async () => {
      const response = { created: 1, failed: 0, rows: [] };
      mutateAsync.mockResolvedValue(response);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.importSupplies?.run(IMPORT_BODY)).resolves.toEqual({
        ok: true,
        value: response,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID) });
    });

    it("hands back a supply import refused as a whole, and refreshes nothing", async () => {
      const refusal = new Error("TEST-REFUSAL");
      mutateAsync.mockRejectedValue(refusal);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.importSupplies?.run(IMPORT_BODY)).resolves.toEqual({ error: refusal });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("refreshes the list the created thing appears in", async () => {
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.createSupply?.run(CREATE_SUPPLY_BODY);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID),
      });
    });
  });

  describe("the integrations", () => {
    it("gates Datadis and Shelly on canManage and invalidates the config the form reads back", async () => {
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.configureDatadis?.run(DATADIS_BODY)).resolves.toEqual({ ok: true });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetDatadisConfigQueryKey(COMMUNITY_ID),
      });

      await result.current.actions.configureShelly?.run(SHELLY_BODY);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetShellyConfigQueryKey(COMMUNITY_ID),
      });
    });

    it("hands a refused Datadis save the error the API answered with, so the form can place it", async () => {
      const refusal = new Error("refused");
      mutateAsync.mockRejectedValue(refusal);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.configureDatadis?.run(DATADIS_BODY)).resolves.toEqual({ error: refusal });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("UI-INT-012 hands over both Datadis switch writes on canManage, and neither without it", () => {
      const allowed = render(communityWith({ canManage: true })).result.current;
      expect(allowed.actions.enableDatadis).toBeDefined();
      expect(allowed.actions.disableDatadis).toBeDefined();
      expect(allowed.outcomes.enableDatadis).toEqual({ state: "allowed" });

      const denied = render(communityWith({ canManage: false })).result.current;
      expect(denied.actions.enableDatadis).toBeUndefined();
      expect(denied.actions.disableDatadis).toBeUndefined();
      expect(denied.outcomes.disableDatadis).toEqual({ state: "denied" });
    });

    it.each([
      ["enableDatadis", () => enableDatadis],
      ["disableDatadis", () => disableDatadis],
    ] as const)(
      "UI-INT-012 %s calls its own endpoint for the community it was handed, and refreshes only that Datadis configuration",
      async (name, endpoint) => {
        const { result, queryClient } = render(communityWith({ canManage: true }));
        const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

        await expect(result.current.actions[name]?.run()).resolves.toEqual({ ok: true });

        expect(endpoint()).toHaveBeenCalledWith({ communityId: COMMUNITY_ID });
        expect(mutateAsync).not.toHaveBeenCalled();
        expect(invalidateQueries.mock.calls).toEqual([[{ queryKey: getGetDatadisConfigQueryKey(COMMUNITY_ID) }]]);
      },
    );

    it("UI-INT-013 hands a refused Datadis enable the error itself, so the card can name what is missing", async () => {
      const refusal = new Error("incomplete");
      enableDatadis.mockRejectedValue(refusal);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.enableDatadis?.run()).resolves.toEqual({ error: refusal });
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    // Huawei's endpoint is plant-scoped, so it is configured per plant (#192).
    it("does not offer the Huawei configuration, which belongs to a plant", () => {
      const { result } = render(communityWith({ canManage: true }));

      expect(result.current.actions).not.toHaveProperty("configureHuawei");
    });
  });

  it("reports failure and leaves the cache alone", async () => {
    const error = new Error("boom");
    mutateAsync.mockRejectedValue(error);
    const { result, queryClient } = render(communityWith({ canUpdate: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.update?.run({ name: "TEST-COMMUNITY-NAME", code: "TEST-CODE" })).resolves.toEqual({ error });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  describe("the contact channels", () => {
    const STORED = {
      channels: [
        { type: "PHONE" as const, label: "Guardia", value: "600 111 222", schedule: null, notes: null },
        { type: "ADDRESS" as const, label: "Oficina", value: "Carrer de la Pau 12", schedule: null, notes: null },
        { type: "EMAIL" as const, label: "Correo", value: "hola@solcomun.test", schedule: null, notes: "En 48 horas." },
      ],
    };

    // There is no contact flag; the backend reports this guard through canManage.
    it("hands out replacing them on canManage only", () => {
      expect(render(communityWith({ canManage: true })).result.current.actions.setContact).toBeDefined();
      expect(
        render(communityWith({ canUpdate: true, canManageMemberships: true })).result.current.actions.setContact,
      ).toBeUndefined();
    });

    it("writes the list as stored into the cache, instead of fetching it again", async () => {
      mutateAsync.mockResolvedValue(STORED);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await expect(result.current.actions.setContact?.run(STORED)).resolves.toEqual({ ok: true, value: STORED });

      expect(mutateAsync).toHaveBeenCalledWith({ communityId: COMMUNITY_ID, data: STORED });
      expect(queryClient.getQueryData(getGetCommunityContactQueryKey(COMMUNITY_ID))).toEqual(STORED);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });

    it("hands back the refusal and leaves the cached list alone", async () => {
      const refusal = new Error("refused");
      mutateAsync.mockRejectedValue(refusal);
      const { result, queryClient } = render(communityWith({ canManage: true }));
      queryClient.setQueryData(getGetCommunityContactQueryKey(COMMUNITY_ID), STORED);

      await expect(result.current.actions.setContact?.run({ channels: [] })).resolves.toEqual({ error: refusal });

      expect(queryClient.getQueryData(getGetCommunityContactQueryKey(COMMUNITY_ID))).toEqual(STORED);
    });
  });
});
