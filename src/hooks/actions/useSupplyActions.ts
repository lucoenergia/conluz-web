import { useQueryClient } from "@tanstack/react-query";
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
import type {
  CreatePlantBody,
  MembershipResponse,
  PlantResponse,
  SupplyResponse,
  UpdateSupplyBody,
} from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";
import { supplyDeletionRefusal } from "../../errors/supplyErrors";

/**
 * What the caller may do with one supply.
 *
 * `edit`, `enable` and `disable` share `canEdit`, because the backend answers
 * them with one flag -- its doc reads "update, enable or disable this supply".
 * Three actions, one answer: a screen cannot offer edit-but-not-disable, and
 * pretending otherwise here would invent a rule the API does not have.
 *
 * `createPlant` gates on the supply's own `canCreatePlant`, not on the
 * community's `canCreatePlants`. The community flag's doc is explicit that it is
 * "necessary but not sufficient for any particular supply"; this is the one that
 * answers for this supply.
 *
 * `remove` gates on the supply's own `canDelete` (lucoenergia/conluz#412). It
 * hands back the refusal rather than `false`: a supply with a plant or a
 * sharing agreement's coefficients is refused with a code the screen words on
 * its own (#290).
 *
 * `transferOwnership` gates on the supply's own `canTransferOwnership`
 * (lucoenergia/conluz#585), which only a community admin of the supply's
 * community holds -- never its owner.
 */
export type SupplyDeleteResult = { ok: true } | { error: unknown };

/**
 * Editing a supply: success, or the refusal itself rather than `false`. A
 * refused CUPS is shown on its input (lucoenergia/conluz#532), so the screen
 * needs the code.
 */
export type SupplyEditResult = { ok: true } | { error: unknown };

/**
 * Making another member the supply's owner (lucoenergia/conluz#585, #423): the
 * chosen membership, whose personal ID is sent and whose account's reads are
 * refreshed, and the day the holder changed at the distributor (YYYY-MM-DD).
 */
export interface SupplyTransferRequest {
  newOwner: Pick<MembershipResponse, "personalId" | "user">;
  effectiveDate: string;
}

/**
 * Transferring a supply: the supply with its new owner, or the refusal itself.
 * A refused date or owner is shown on its input, so the screen needs the code.
 */
export type SupplyTransferResult = { ok: true; supply: SupplyResponse } | { error: unknown };

export interface SupplyRowActions {
  actions: {
    edit: MaybeAction<[UpdateSupplyBody], SupplyEditResult>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    createPlant: MaybeAction<[CreatePlantBody], PlantResponse | undefined>;
    remove: MaybeAction<[], SupplyDeleteResult>;
    transferOwnership: MaybeAction<[SupplyTransferRequest], SupplyTransferResult>;
  };
  outcomes: {
    edit: CapabilityOutcome;
    enable: CapabilityOutcome;
    disable: CapabilityOutcome;
    createPlant: CapabilityOutcome;
    remove: CapabilityOutcome;
    transferOwnership: CapabilityOutcome;
  };
}

export interface SupplyActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forSupply: (supply: SupplyResponse | undefined) => SupplyRowActions;
}

export function useSupplyActions(): SupplyActions {
  const queryClient = useQueryClient();
  const activeCommunityId = useActiveCommunity();

  const updateMutation = useUpdateSupply();
  const enableMutation = useEnableSupply();
  const disableMutation = useDisableSupply();
  const createPlantMutation = useCreatePlant();
  const deleteMutation = useDeleteSupply();
  const transferMutation = useTransferSupplyOwnership();

  // The pages these replace call their own query's refetch() instead, which
  // only refreshes the list the caller happens to be looking at. Invalidating
  // the keys is the house convention (AGENTS.md, "Invalidation is explicit") and
  // also refreshes the detail page and any other mounted reader.
  const invalidateSupply = (supplyId: string, ownerId: string | undefined) => {
    queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(supplyId) });
    invalidateLists(ownerId);
  };

  // The listings that show the supply: the community's, and its owner's -- the
  // member's supplies reached from the members screen (?personId=).
  const invalidateLists = (ownerId: string | undefined) => {
    // No params: the key is a prefix, so every page and filter variant matches.
    queryClient.invalidateQueries({ queryKey: getGetAllSuppliesQueryKey(activeCommunityId ?? "") });
    if (ownerId) queryClient.invalidateQueries({ queryKey: getGetSuppliesByUserIdQueryKey(ownerId) });
  };

  // Everything that names or counts a supply once it is gone. The detail is
  // never refetched: that could only answer 404. Where nobody reads it, it is
  // dropped. Where somebody does -- the detail page, which is leaving -- it is
  // only marked stale: dropping a query its page still watches makes the page
  // fetch it again before the navigation lands.
  const forgetSupply = (supplyId: string, ownerId: string | undefined) => {
    const communityId = activeCommunityId ?? "";
    queryClient.removeQueries({ queryKey: getGetSupplyQueryKey(supplyId), type: "inactive" });
    queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(supplyId), refetchType: "none" });
    invalidateLists(ownerId);
    // CommunityResponse.supplyPointCount, read by the communities page and the
    // platform overview.
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCommunityByIdQueryKey(communityId) });
    if (ownerId) {
      // Prefixes over every period: the owner's metrics count their supplies.
      queryClient.invalidateQueries({ queryKey: getGetMembershipEnergyMetricsQueryKey(communityId, ownerId) });
      queryClient.invalidateQueries({ queryKey: getGetMembershipMonthlyConsumptionQueryKey(communityId, ownerId) });
    }
  };

  // Everything a transfer changes for one of the two owners: the supplies they
  // own, and every figure of their membership, which counts the supply's whole
  // history for its owner -- months before the transfer included.
  const invalidateOwnerReads = (ownerId: string) => {
    const communityId = activeCommunityId ?? "";
    queryClient.invalidateQueries({ queryKey: getGetSuppliesByUserIdQueryKey(ownerId) });
    // Prefixes over every period.
    queryClient.invalidateQueries({ queryKey: getGetMembershipEnergyMetricsQueryKey(communityId, ownerId) });
    queryClient.invalidateQueries({ queryKey: getGetMembershipMonthlyConsumptionQueryKey(communityId, ownerId) });
    queryClient.invalidateQueries({ queryKey: getGetMembershipDailyConsumptionQueryKey(communityId, ownerId) });
    queryClient.invalidateQueries({ queryKey: getGetMembershipHourlyConsumptionQueryKey(communityId, ownerId) });
    queryClient.invalidateQueries({ queryKey: getGetMembershipHourlyProfileQueryKey(communityId, ownerId) });
    queryClient.invalidateQueries({ queryKey: getGetMembershipPaybackQueryKey(communityId, ownerId) });
  };

  const run = async (call: () => Promise<unknown>, supplyId: string, ownerId: string | undefined) => {
    try {
      await call();
      invalidateSupply(supplyId, ownerId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    forSupply: (supply) => {
      const supplyId = supply?.id ?? "";
      const ownerId = supply?.user?.id;
      const capabilities = supply?.capabilities;

      const edit = outcomeFromResource(capabilities, "canEdit");
      const createPlant = outcomeFromResource(capabilities, "canCreatePlant");
      const remove = outcomeFromResource(capabilities, "canDelete");
      const transferOwnership = outcomeFromResource(capabilities, "canTransferOwnership");

      return {
        actions: {
          edit: grant(
            edit,
            async (data: UpdateSupplyBody): Promise<SupplyEditResult> => {
              try {
                await updateMutation.mutateAsync({ supplyId, data });
                invalidateSupply(supplyId, ownerId);
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            updateMutation.isPending,
          ),
          enable: grant(
            edit,
            () => run(() => enableMutation.mutateAsync({ supplyId }), supplyId, ownerId),
            enableMutation.isPending,
          ),
          disable: grant(
            edit,
            () => run(() => disableMutation.mutateAsync({ supplyId }), supplyId, ownerId),
            disableMutation.isPending,
          ),
          createPlant: grant(
            createPlant,
            async (data: CreatePlantBody) => {
              try {
                const plant = await createPlantMutation.mutateAsync({ data });
                queryClient.invalidateQueries({
                  queryKey: getGetAllPlantsQueryKey(activeCommunityId ?? ""),
                });
                // The supply now has a plant, which its own response reports.
                invalidateSupply(supplyId, ownerId);
                return plant;
              } catch {
                return undefined;
              }
            },
            createPlantMutation.isPending,
          ),
          remove: grant(
            remove,
            async (): Promise<SupplyDeleteResult> => {
              try {
                await deleteMutation.mutateAsync({ supplyId });
                forgetSupply(supplyId, ownerId);
                return { ok: true };
              } catch (error) {
                // A 404 is a supply somebody else already deleted: the reads
                // that show it are as stale as after a successful delete.
                if (supplyDeletionRefusal(error) === "not-found") forgetSupply(supplyId, ownerId);
                return { error };
              }
            },
            deleteMutation.isPending,
          ),
          transferOwnership: grant(
            transferOwnership,
            async ({ newOwner, effectiveDate }: SupplyTransferRequest): Promise<SupplyTransferResult> => {
              try {
                const transferred = await transferMutation.mutateAsync({
                  supplyId,
                  data: { newOwnerPersonalId: newOwner.personalId, effectiveDate },
                });
                // The previous owner is the one this supply was read with,
                // before the request; both owners' reads change (#423).
                invalidateSupply(supplyId, undefined);
                if (ownerId) invalidateOwnerReads(ownerId);
                invalidateOwnerReads(newOwner.user.id);
                return { ok: true, supply: transferred };
              } catch (error) {
                return { error };
              }
            },
            transferMutation.isPending,
          ),
        },
        outcomes: { edit, enable: edit, disable: edit, createPlant, remove, transferOwnership },
      };
    },
  };
}
