import { useQueryClient } from "@tanstack/react-query";
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
  useCreateSupply,
  useImportSupplies,
} from "../../api/supplies/supplies";
import { getGetAllPlantsQueryKey, useCreatePlant } from "../../api/plants/plants";
import {
  getGetDatadisConfigQueryKey,
  getGetShellyConfigQueryKey,
  useConfigureDatadis,
  useConfigureShelly,
  useDisableDatadisConfig,
  useEnableDatadisConfig,
} from "../../api/consumption/consumption";
import {
  getGetCommunityAdminsQueryKey,
  useDisableCommunityAdmin,
  useEnableCommunityAdmin,
  useInviteCommunityAdmin,
  useResendCommunityAdminInvitation,
  useRevokeCommunityAdminInvitation,
} from "../../api/memberships/memberships";
import { getGetCurrentUserQueryKey } from "../../api/users/users";
import type {
  CommunityAdminResponse,
  CommunityContactResponse,
  CommunityResponse,
  ConfigureDatadisBody,
  ConfigureShellyBody,
  CreatePlantBody,
  CreateSupplyBody,
  ImportSuppliesBody,
  ImportSuppliesResponse,
  InviteCommunityAdminBody,
  PlantResponse,
  RestErrorDetailCode,
  SetCommunityContactBody,
  SupplyResponse,
  UpdateCommunityBody,
} from "../../api/models";
import { getFirstApiErrorCode } from "../../errors/apiErrorCatalogue";
import { STALE_ROW_CODES } from "../../errors/membershipErrors";
import { outcomeFromResource, PENDING, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";
import type { MembershipWriteResult } from "./useMembershipActions";

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
 *   `canCreateSupplies`, unlike the sibling `canCreatePlants` -- but
 *   `canManage`'s own doc names "creating and importing its supplies", so this
 *   is the backend's stated umbrella rather than a guess.
 * - the Datadis and Shelly configuration, and turning Datadis on and off, gate
 *   on `canManage` for the same reason: its doc names "reading and writing its
 *   Datadis and Shelly configuration". `enableDatadis` and `disableDatadis` are
 *   an opposite pair, both handed over to a caller who may do either; the
 *   stored `enabled` picks which one applies.
 * - replacing the contact channels (#296) gates on `canManage` too. There is no
 *   contact flag, and the backend reports this guard through `canManage`, which
 *   allows the same callers.
 *
 * A community's admins are managed here too (#276), on `canManageAdmins`, a
 * platform-wide decision: being a community admin does not confer it. Their
 * rows carry no capabilities of their own, so every admin action is the
 * community's answer, and whether it applies right now is the row's state,
 * which the screen reads.
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

/**
 * A community write: the response, or the refusal itself rather than a bare
 * `false`. The create and edit screens place COMMUNITY_ALREADY_EXISTS on the
 * input its `field` names (#232), so they need the error. `value` is the
 * response, when the screen needs it.
 */
export type CommunityWriteResult<T = void> = { ok: true; value: T } | { error: unknown };

export interface CommunityRowActions {
  actions: {
    update: MaybeAction<[UpdateCommunityBody], CommunityWriteResult>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    createPlant: MaybeAction<[CreatePlantBody], PlantResponse | undefined>;
    createSupply: MaybeAction<[CreateSupplyBody], CommunityWriteResult<SupplyResponse>>;
    importSupplies: MaybeAction<[ImportSuppliesBody], CommunityWriteResult<ImportSuppliesResponse>>;
    configureDatadis: MaybeAction<[ConfigureDatadisBody], ConfigureDatadisResult>;
    configureShelly: MaybeAction<[ConfigureShellyBody], boolean>;
    enableDatadis: MaybeAction<[], DatadisToggleResult>;
    disableDatadis: MaybeAction<[], DatadisToggleResult>;
    inviteAdmin: MaybeAction<[InviteCommunityAdminBody], MembershipWriteResult<CommunityAdminResponse>>;
    setContact: MaybeAction<[SetCommunityContactBody], CommunityWriteResult<CommunityContactResponse>>;
  };
  outcomes: Record<keyof CommunityRowActions["actions"], CapabilityOutcome>;
}

/** What the caller may do to one admin of a community, by the names useMembershipActions gives a member's. */
export interface CommunityAdminRowActions {
  actions: {
    resendInvitation: MaybeAction<[], MembershipWriteResult<CommunityAdminResponse>>;
    revokeInvitation: MaybeAction<[], MembershipWriteResult<CommunityAdminResponse>>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
  };
  outcomes: Record<keyof CommunityAdminRowActions["actions"], CapabilityOutcome>;
}

export interface CommunityActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forCommunity: (community: CommunityResponse | undefined) => CommunityRowActions;
  /**
   * The per-row gate of a community's admins page: the community's
   * `canManageAdmins`, asked once per admin row, which names whom to act on.
   */
  forCommunityAdmin: (
    community: CommunityResponse | undefined,
    admin: Pick<CommunityAdminResponse, "user"> | undefined,
  ) => CommunityAdminRowActions;
}

export function useCommunityActions(): CommunityActions {
  const queryClient = useQueryClient();

  const updateMutation = useUpdateCommunity();
  const enableMutation = useEnableCommunity();
  const disableMutation = useDisableCommunity();
  const createPlantMutation = useCreatePlant();
  const createSupplyMutation = useCreateSupply();
  const importSuppliesMutation = useImportSupplies();
  const configureDatadisMutation = useConfigureDatadis();
  const configureShellyMutation = useConfigureShelly();
  const enableDatadisMutation = useEnableDatadisConfig();
  const disableDatadisMutation = useDisableDatadisConfig();
  const inviteAdminMutation = useInviteCommunityAdmin();
  const resendAdminInvitationMutation = useResendCommunityAdminInvitation();
  const revokeAdminInvitationMutation = useRevokeCommunityAdminInvitation();
  const enableAdminMutation = useEnableCommunityAdmin();
  const disableAdminMutation = useDisableCommunityAdmin();
  const setContactMutation = useSetCommunityContact();

  const invalidateAdmins = (communityId: string) =>
    queryClient.invalidateQueries({ queryKey: getGetCommunityAdminsQueryKey(communityId) });
  // The communities list names each community's admins, so a write to them
  // refreshes it along with the admins themselves.
  const invalidateAfterAdminWrite = (communityId: string) => {
    invalidateAdmins(communityId);
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
  };

  /**
   * An admin write whose refusal the screen words itself. A refusal in
   * `staleRowCodes` says the row changed under the screen, so the list is
   * refetched as well, as useMembershipActions does for the roster.
   */
  const writeAdmins = async <T>(
    communityId: string,
    call: () => Promise<T>,
    staleRowCodes: readonly RestErrorDetailCode[],
  ): Promise<MembershipWriteResult<T>> => {
    try {
      const value = await call();
      invalidateAfterAdminWrite(communityId);
      return { ok: true, value };
    } catch (error) {
      const code = getFirstApiErrorCode(error);
      if (code && staleRowCodes.includes(code)) invalidateAdmins(communityId);
      return { error };
    }
  };

  return {
    forCommunity: (community) => {
      const communityId = community?.id ?? "";
      const capabilities = community?.capabilities;

      const update = outcomeFromResource(capabilities, "canUpdate");
      const enable = outcomeFromResource(capabilities, "canEnable");
      const disable = outcomeFromResource(capabilities, "canDisable");
      const createPlant = outcomeFromResource(capabilities, "canCreatePlants");
      const manage = outcomeFromResource(capabilities, "canManage");
      const manageAdmins = outcomeFromResource(capabilities, "canManageAdmins");

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
            async (data: UpdateCommunityBody): Promise<CommunityWriteResult> => {
              try {
                await updateMutation.mutateAsync({ communityId, data });
                invalidateCommunity();
                return { ok: true, value: undefined };
              } catch (error) {
                return { error };
              }
            },
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
          // Approximation: canManage, for want of a canCreateSupplies.
          // A refused CUPS or owner is shown on its input, so the refusal is handed back.
          createSupply: grant(
            manage,
            async (data: CreateSupplyBody): Promise<CommunityWriteResult<SupplyResponse>> => {
              try {
                const value = await createSupplyMutation.mutateAsync({ data });
                invalidateSupplies();
                return { ok: true, value };
              } catch (error) {
                return { error };
              }
            },
            createSupplyMutation.isPending,
          ),
          // A file refused as a whole is the refusal itself: the dialog names
          // its SUPPLY_IMPORT_* code. A 200 may still hold failed rows.
          importSupplies: grant(
            manage,
            async (data: ImportSuppliesBody): Promise<CommunityWriteResult<ImportSuppliesResponse>> => {
              try {
                const value = await importSuppliesMutation.mutateAsync({ communityId, data });
                invalidateSupplies();
                return { ok: true, value };
              } catch (error) {
                return { error };
              }
            },
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
          // Somebody already in the community, in any role, is refused with
          // MEMBERSHIP_ALREADY_EXISTS: they may be an admin this list has not
          // shown yet, so the refusal refetches it.
          inviteAdmin: grant(
            manageAdmins,
            (data: InviteCommunityAdminBody) =>
              writeAdmins(communityId, () => inviteAdminMutation.mutateAsync({ communityId, data }), [
                "MEMBERSHIP_ALREADY_EXISTS",
              ]),
            inviteAdminMutation.isPending,
          ),
          // The response is the list as stored, so it replaces the cached one
          // rather than being fetched again.
          setContact: grant(
            manage,
            async (data: SetCommunityContactBody): Promise<CommunityWriteResult<CommunityContactResponse>> => {
              try {
                const value = await setContactMutation.mutateAsync({ communityId, data });
                queryClient.setQueryData(getGetCommunityContactQueryKey(communityId), value);
                return { ok: true, value };
              } catch (error) {
                return { error };
              }
            },
            setContactMutation.isPending,
          ),
        },
        outcomes: {
          update,
          enable,
          disable,
          createPlant,
          createSupply: manage,
          importSupplies: manage,
          configureDatadis: manage,
          configureShelly: manage,
          enableDatadis: manage,
          disableDatadis: manage,
          inviteAdmin: manageAdmins,
          setContact: manage,
        },
      };
    },

    forCommunityAdmin: (community, admin) => {
      const communityId = community?.id ?? "";
      const userId = admin?.user.id ?? "";
      // No row, nobody to act on: not yet known, like a community not yet loaded.
      const manageAdmins = admin ? outcomeFromResource(community?.capabilities, "canManageAdmins") : PENDING;

      // The admin's own membership may be the caller's: a platform admin can
      // be an admin of the community too, and suspending that membership
      // changes what the caller may reach.
      const toggle = async (call: () => Promise<unknown>) => {
        try {
          await call();
          invalidateAfterAdminWrite(communityId);
          queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          return true;
        } catch {
          return false;
        }
      };

      return {
        actions: {
          resendInvitation: grant(
            manageAdmins,
            () =>
              writeAdmins(
                communityId,
                () => resendAdminInvitationMutation.mutateAsync({ communityId, userId }),
                STALE_ROW_CODES.resend,
              ),
            resendAdminInvitationMutation.isPending,
          ),
          revokeInvitation: grant(
            manageAdmins,
            () =>
              writeAdmins(
                communityId,
                () => revokeAdminInvitationMutation.mutateAsync({ communityId, userId }),
                STALE_ROW_CODES.revoke,
              ),
            revokeAdminInvitationMutation.isPending,
          ),
          enable: grant(
            manageAdmins,
            () => toggle(() => enableAdminMutation.mutateAsync({ communityId, userId })),
            enableAdminMutation.isPending,
          ),
          disable: grant(
            manageAdmins,
            () => toggle(() => disableAdminMutation.mutateAsync({ communityId, userId })),
            disableAdminMutation.isPending,
          ),
        },
        outcomes: {
          resendInvitation: manageAdmins,
          revokeInvitation: manageAdmins,
          enable: manageAdmins,
          disable: manageAdmins,
        },
      };
    },
  };
}
