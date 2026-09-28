import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAllSuppliesQueryKey,
  getGetSupplyQueryKey,
  useDisableSupply,
  useEnableSupply,
  useUpdateSupply,
} from "../../api/supplies/supplies";
import { getGetAllPlantsQueryKey, useCreatePlant } from "../../api/plants/plants";
import type { CreatePlantBody, PlantResponse, SupplyResponse, UpdateSupplyBody } from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

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
 */
export interface SupplyRowActions {
  actions: {
    edit: MaybeAction<[UpdateSupplyBody], boolean>;
    enable: MaybeAction<[], boolean>;
    disable: MaybeAction<[], boolean>;
    createPlant: MaybeAction<[CreatePlantBody], PlantResponse | undefined>;
  };
  outcomes: {
    edit: CapabilityOutcome;
    enable: CapabilityOutcome;
    disable: CapabilityOutcome;
    createPlant: CapabilityOutcome;
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

  // The pages these replace call their own query's refetch() instead, which
  // only refreshes the list the caller happens to be looking at. Invalidating
  // the keys is the house convention (CLAUDE.md, "Invalidation is explicit") and
  // also refreshes the detail page and any other mounted reader.
  const invalidateSupply = (supplyId: string) => {
    queryClient.invalidateQueries({ queryKey: getGetSupplyQueryKey(supplyId) });
    // No params: the key is a prefix, so every page and filter variant matches.
    queryClient.invalidateQueries({ queryKey: getGetAllSuppliesQueryKey(activeCommunityId ?? "") });
  };

  const run = async (call: () => Promise<unknown>, supplyId: string) => {
    try {
      await call();
      invalidateSupply(supplyId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    forSupply: (supply) => {
      const supplyId = supply?.id ?? "";
      const capabilities = supply?.capabilities;

      const edit = outcomeFromResource(capabilities, "canEdit");
      const createPlant = outcomeFromResource(capabilities, "canCreatePlant");

      return {
        actions: {
          edit: grant(
            edit,
            (data: UpdateSupplyBody) =>
              run(() => updateMutation.mutateAsync({ supplyId, data }), supplyId),
            updateMutation.isPending,
          ),
          enable: grant(
            edit,
            () => run(() => enableMutation.mutateAsync({ supplyId }), supplyId),
            enableMutation.isPending,
          ),
          disable: grant(
            edit,
            () => run(() => disableMutation.mutateAsync({ supplyId }), supplyId),
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
                invalidateSupply(supplyId);
                return plant;
              } catch {
                return undefined;
              }
            },
            createPlantMutation.isPending,
          ),
        },
        outcomes: { edit, enable: edit, disable: edit, createPlant },
      };
    },
  };
}
