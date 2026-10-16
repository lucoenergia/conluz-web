import { useQueryClient } from "@tanstack/react-query";
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
import { getGetAllPlantsQueryKey, useCreatePlant } from "../../api/plants/plants";
import { getGetAllUsersQueryKey, useCreateUser, useCreateUsersWithFile } from "../../api/users/users";
import {
  getGetDatadisConfigQueryKey,
  getGetShellyConfigQueryKey,
  useConfigureDatadis,
  useConfigureShelly,
  useDisableDatadisConfig,
  useEnableDatadisConfig,
} from "../../api/consumption/consumption";
import type {
  CommunityResponse,
  ConfigureDatadisBody,
  CreationInBulkResponse,
  CreateUsersInBulkResponse,
  ConfigureShellyBody,
  CreatePlantBody,
  CreateSuppliesWithFileBody,
  CreateSupplyBody,
  CreateUserBody,
  CreateUsersWithFileBody,
  PlantResponse,
  SupplyResponse,
  UpdateCommunityBody,
  UserResponse,
} from "../../api/models";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * What the caller may do in one community -- including the things that have no
 * resource of their own to hang off, because they create one.
 *
 * Takes the community rather than reading the active one, so a screen working
 * on a community the caller is not currently in (the communities list) gets the
 * right answer rather than the active community's.
 *
 * Two gates are approximations, marked at the action:
 *
 * - creating and importing supplies gate on `canManage`. There is no
 *   `canCreateSupplies`, unlike the sibling `canCreatePlants` and
 *   `canCreateUsers` -- but `canManage`'s own doc names "creating and importing
 *   its supplies", so this is the backend's stated umbrella rather than a guess.
 * - the Datadis and Shelly configuration, and turning Datadis on and off, gate
 *   on `canManage` for the same reason: its doc names "reading and writing its
 *   Datadis and Shelly configuration". `enableDatadis` and `disableDatadis` are
 *   an opposite pair, both handed over to a caller who may do either; the
 *   stored `enabled` picks which one applies.
 *
 * The Huawei configuration is NOT here. Its endpoint is plant-scoped, so it
 * lives in usePlantActions, and its form on plant detail (#192).
 */
/**
 * A Datadis save either succeeds or carries the error the API answered with.
 * The screen needs the error, not just "it failed": a save that omits the
 * password when none is stored is refused with DATADIS_CONFIG_PASSWORD_REQUIRED
 * (#245), and the admin must be told on the password field.
 */
export type ConfigureDatadisResult = { ok: true } | { error: unknown };

/**
 * Turning Datadis on or off: success, or the refusal itself. An enable is
 * refused with DATADIS_CONFIG_INCOMPLETE when the configuration lacks data,
 * and the screen names the missing fields (#256).
 */
export type DatadisToggleResult = { ok: true } | { error: unknown };

export interface CommunityRowActions {
  actions: {
    update: MaybeAction<[UpdateCommunityBody], boolean>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    createPlant: MaybeAction<[CreatePlantBody], PlantResponse | undefined>;
    createUser: MaybeAction<[CreateUserBody], UserResponse | undefined>;
    importUsers: MaybeAction<[CreateUsersWithFileBody], CreateUsersInBulkResponse | undefined>;
    createSupply: MaybeAction<[CreateSupplyBody], SupplyResponse | undefined>;
    importSupplies: MaybeAction<[CreateSuppliesWithFileBody], CreationInBulkResponse | undefined>;
    configureDatadis: MaybeAction<[ConfigureDatadisBody], ConfigureDatadisResult>;
    configureShelly: MaybeAction<[ConfigureShellyBody], boolean>;
    enableDatadis: MaybeAction<[], DatadisToggleResult>;
    disableDatadis: MaybeAction<[], DatadisToggleResult>;
  };
  outcomes: Record<keyof CommunityRowActions["actions"], CapabilityOutcome>;
}

export interface CommunityActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forCommunity: (community: CommunityResponse | undefined) => CommunityRowActions;
}

export function useCommunityActions(): CommunityActions {
  const queryClient = useQueryClient();

  const updateMutation = useUpdateCommunity();
  const enableMutation = useEnableCommunity();
  const disableMutation = useDisableCommunity();
  const createPlantMutation = useCreatePlant();
  const createUserMutation = useCreateUser();
  const importUsersMutation = useCreateUsersWithFile();
  const createSupplyMutation = useCreateSupply();
  const importSuppliesMutation = useCreateSuppliesWithFile();
  const configureDatadisMutation = useConfigureDatadis();
  const configureShellyMutation = useConfigureShelly();
  const enableDatadisMutation = useEnableDatadisConfig();
  const disableDatadisMutation = useDisableDatadisConfig();

  return {
    forCommunity: (community) => {
      const communityId = community?.id ?? "";
      const capabilities = community?.capabilities;

      const update = outcomeFromResource(capabilities, "canUpdate");
      const enable = outcomeFromResource(capabilities, "canEnable");
      const disable = outcomeFromResource(capabilities, "canDisable");
      const createPlant = outcomeFromResource(capabilities, "canCreatePlants");
      const createUsers = outcomeFromResource(capabilities, "canCreateUsers");
      const manage = outcomeFromResource(capabilities, "canManage");

      const invalidateCommunity = () => {
        queryClient.invalidateQueries({ queryKey: getGetCommunityByIdQueryKey(communityId) });
        queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
      };

      const runOnCommunity = async (call: () => Promise<unknown>) => {
        try {
          await call();
          invalidateCommunity();
          return true;
        } catch {
          return false;
        }
      };

      const runCreating = async <T>(call: () => Promise<T>, invalidate: () => void) => {
        try {
          const created = await call();
          invalidate();
          return created;
        } catch {
          return undefined;
        }
      };

      const invalidateSupplies = () =>
        queryClient.invalidateQueries({ queryKey: getGetAllSuppliesQueryKey(communityId) });
      const invalidateUsers = () =>
        queryClient.invalidateQueries({ queryKey: getGetAllUsersQueryKey() });
      const invalidatePlants = () =>
        queryClient.invalidateQueries({ queryKey: getGetAllPlantsQueryKey(communityId) });

      // Only this community's Datadis configuration is read back.
      const toggleDatadis = async (call: () => Promise<unknown>): Promise<DatadisToggleResult> => {
        try {
          await call();
          queryClient.invalidateQueries({ queryKey: getGetDatadisConfigQueryKey(communityId) });
          return { ok: true };
        } catch (error) {
          return { error };
        }
      };

      return {
        actions: {
          update: grant(
            update,
            (data: UpdateCommunityBody) =>
              runOnCommunity(() => updateMutation.mutateAsync({ communityId, data })),
            updateMutation.isPending,
          ),
          enable: grant(
            enable,
            () => runOnCommunity(() => enableMutation.mutateAsync({ communityId })),
            enableMutation.isPending,
          ),
          disable: grant(
            disable,
            () => runOnCommunity(() => disableMutation.mutateAsync({ communityId })),
            disableMutation.isPending,
          ),
          createPlant: grant(
            createPlant,
            (data: CreatePlantBody) =>
              runCreating(() => createPlantMutation.mutateAsync({ data }), invalidatePlants),
            createPlantMutation.isPending,
          ),
          createUser: grant(
            createUsers,
            (data: CreateUserBody) =>
              runCreating(() => createUserMutation.mutateAsync({ data }), invalidateUsers),
            createUserMutation.isPending,
          ),
          importUsers: grant(
            createUsers,
            (data: CreateUsersWithFileBody) =>
              runCreating(
                () => importUsersMutation.mutateAsync({ data, params: { communityId } }),
                invalidateUsers,
              ),
            importUsersMutation.isPending,
          ),
          // Approximation: canManage, for want of a canCreateSupplies.
          createSupply: grant(
            manage,
            (data: CreateSupplyBody) =>
              runCreating(() => createSupplyMutation.mutateAsync({ data }), invalidateSupplies),
            createSupplyMutation.isPending,
          ),
          importSupplies: grant(
            manage,
            (data: CreateSuppliesWithFileBody) =>
              runCreating(
                () => importSuppliesMutation.mutateAsync({ data, params: { communityId } }),
                invalidateSupplies,
              ),
            importSuppliesMutation.isPending,
          ),
          configureDatadis: grant(
            manage,
            async (data: ConfigureDatadisBody): Promise<ConfigureDatadisResult> => {
              try {
                await configureDatadisMutation.mutateAsync({ communityId, data });
                queryClient.invalidateQueries({ queryKey: getGetDatadisConfigQueryKey(communityId) });
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            configureDatadisMutation.isPending,
          ),
          configureShelly: grant(
            manage,
            async (data: ConfigureShellyBody) => {
              try {
                await configureShellyMutation.mutateAsync({ communityId, data });
                queryClient.invalidateQueries({ queryKey: getGetShellyConfigQueryKey(communityId) });
                return true;
              } catch {
                return false;
              }
            },
            configureShellyMutation.isPending,
          ),
          enableDatadis: grant(
            manage,
            () => toggleDatadis(() => enableDatadisMutation.mutateAsync({ communityId })),
            enableDatadisMutation.isPending,
          ),
          disableDatadis: grant(
            manage,
            () => toggleDatadis(() => disableDatadisMutation.mutateAsync({ communityId })),
            disableDatadisMutation.isPending,
          ),
        },
        outcomes: {
          update,
          enable,
          disable,
          createPlant,
          createUser: createUsers,
          importUsers: createUsers,
          createSupply: manage,
          importSupplies: manage,
          configureDatadis: manage,
          configureShelly: manage,
          enableDatadis: manage,
          disableDatadis: manage,
        },
      };
    },
  };
}
