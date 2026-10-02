import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getGetAllCommunitiesQueryKey,
  getGetCommunityByIdQueryKey,
  useDisableCommunity,
  useEnableCommunity,
  useUpdateCommunity,
} from "../../api/communities/communities";
import {
  getGetAllSuppliesQueryKey,
  useCreateSuppliesWithFile,
  useCreateSupply,
} from "../../api/supplies/supplies";
import { useCreatePlant } from "../../api/plants/plants";
import { getGetAllUsersQueryKey, useCreateUser, useCreateUsersWithFile } from "../../api/users/users";
import {
  getGetDatadisConfigQueryKey,
  getGetShellyConfigQueryKey,
  useConfigureDatadis,
  useConfigureShelly,
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
const CREATE_USER_BODY = {
  personalId: "TEST-PERSONAL-ID",
  number: 90001,
  fullName: "TEST-FULL-NAME",
  email: "test@example.invalid",
  password: "TEST-PASSWORD",
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
}));
vi.mock(import("../../api/supplies/supplies"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateSupply: vi.fn(),
  useCreateSuppliesWithFile: vi.fn(),
}));
vi.mock(import("../../api/plants/plants"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreatePlant: vi.fn(),
}));
vi.mock(import("../../api/users/users"), async (importOriginal) => ({
  ...(await importOriginal()),
  useCreateUser: vi.fn(),
  useCreateUsersWithFile: vi.fn(),
}));
vi.mock(import("../../api/consumption/consumption"), async (importOriginal) => ({
  ...(await importOriginal()),
  useConfigureDatadis: vi.fn(),
  useConfigureShelly: vi.fn(),
}));

const COMMUNITY_ID = "TEST-COMMUNITY-ID";

const communityWith = (capabilities: Parameters<typeof buildCommunityCapabilities>[0]) =>
  buildCommunity({ id: COMMUNITY_ID, capabilities: buildCommunityCapabilities(capabilities) });

const render = (community: ReturnType<typeof buildCommunity> | undefined) =>
  renderHookWithProviders(() => useCommunityActions().forCommunity(community));

let mutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useUpdateCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useEnableCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useDisableCommunity).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateSupply).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateSuppliesWithFile).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreatePlant).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateUser).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useCreateUsersWithFile).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureDatadis).mockReturnValue(mutation.idle({ mutateAsync }));
  vi.mocked(useConfigureShelly).mockReturnValue(mutation.idle({ mutateAsync }));
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
    // There is no canCreateSupplies, unlike the sibling canCreatePlants and
    // canCreateUsers. canManage's own doc names "creating and importing its
    // supplies", so it is the backend's stated umbrella rather than a guess --
    // and it must not leak a grant to the flags that do exist.
    it("gates creating and importing supplies on canManage, for want of a narrower flag", () => {
      const { result } = render(communityWith({ canManage: true }));

      expect(result.current.actions.createSupply).toBeDefined();
      expect(result.current.actions.importSupplies).toBeDefined();
      expect(result.current.actions.createPlant).toBeUndefined();
      expect(result.current.actions.createUser).toBeUndefined();
    });

    it("gates creating and importing users on canCreateUsers", () => {
      const { result } = render(communityWith({ canCreateUsers: true }));

      expect(result.current.actions.createUser).toBeDefined();
      expect(result.current.actions.importUsers).toBeDefined();
      expect(result.current.actions.createSupply).toBeUndefined();
    });

    it("scopes an import to the community it was handed", async () => {
      const { result } = render(communityWith({ canCreateUsers: true }));

      await result.current.actions.importUsers?.run(IMPORT_BODY);

      expect(mutateAsync).toHaveBeenCalledWith({
        data: IMPORT_BODY,
        params: { communityId: COMMUNITY_ID },
      });
    });

    it("scopes a supply import to the community it was handed", async () => {
      const { result } = render(communityWith({ canManage: true }));

      await result.current.actions.importSupplies?.run(IMPORT_BODY);

      // The screen used to pass this itself, from the active community, which
      // is a second place the target could be decided -- and disagree.
      expect(mutateAsync).toHaveBeenCalledWith({
        data: IMPORT_BODY,
        params: { communityId: COMMUNITY_ID },
      });
    });

    it("refreshes the list the created thing appears in", async () => {
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.createSupply?.run(CREATE_SUPPLY_BODY);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetAllSuppliesQueryKey(COMMUNITY_ID),
      });

      const users = render(communityWith({ canCreateUsers: true }));
      const invalidateUsers = vi.spyOn(users.queryClient, "invalidateQueries");
      await users.result.current.actions.createUser?.run(CREATE_USER_BODY);
      expect(invalidateUsers).toHaveBeenCalledWith({ queryKey: getGetAllUsersQueryKey() });
    });
  });

  describe("the integrations", () => {
    it("gates Datadis and Shelly on canManage and invalidates the config the form reads back", async () => {
      const { result, queryClient } = render(communityWith({ canManage: true }));
      const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

      await result.current.actions.configureDatadis?.run(DATADIS_BODY);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetDatadisConfigQueryKey(COMMUNITY_ID),
      });

      await result.current.actions.configureShelly?.run(SHELLY_BODY);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: getGetShellyConfigQueryKey(COMMUNITY_ID),
      });
    });

    // Huawei's endpoint is plant-scoped, so it is not here even though the
    // integrations screen shows all three forms together.
    it("does not offer the Huawei configuration, which belongs to a plant", () => {
      const { result } = render(communityWith({ canManage: true }));

      expect(result.current.actions).not.toHaveProperty("configureHuawei");
    });
  });

  it("reports failure and leaves the cache alone", async () => {
    mutateAsync.mockRejectedValue(new Error("boom"));
    const { result, queryClient } = render(communityWith({ canUpdate: true }));
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    await expect(result.current.actions.update?.run({ name: "TEST-COMMUNITY-NAME", code: "TEST-CODE" })).resolves.toBe(false);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
