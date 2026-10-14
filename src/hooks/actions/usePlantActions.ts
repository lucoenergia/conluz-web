import { useQueryClient } from "@tanstack/react-query";
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
import type {
  ConfigureHuaweiBody,
  CreateSharingAgreementBody,
  PlantResponse,
  SharingAgreementResponse,
  UpdatePlantBody,
} from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * What the caller may do with one plant.
 *
 * `edit`, `remove` and `configureHuawei` share `canManage`: its doc covers
 * "update or delete this plant, and read and write its Huawei configuration".
 * One answer, three actions.
 *
 * `configureHuawei` belongs here rather than on the community: its endpoint is
 * PUT /plants/{plantId}/production/huawei/config, so the plant is what
 * authorises it, and the form lives on the plant's own detail screen (#192).
 */
/**
 * A Huawei configuration write: success, or the refusal itself rather than a
 * bare `false`. The screen places some refusals on a field or a message of
 * their own -- HUAWEI_CONFIG_PASSWORD_REQUIRED on the password (#192) -- so it
 * needs the error. Same shape as ConfigureDatadisResult.
 */
export type HuaweiWriteResult = { ok: true } | { error: unknown };

export interface PlantRowActions {
  actions: {
    edit: MaybeAction<[UpdatePlantBody], boolean>;
    remove: MaybeAction<[], boolean>;
    configureHuawei: MaybeAction<[ConfigureHuaweiBody], HuaweiWriteResult>;
    createSharingAgreement: MaybeAction<[CreateSharingAgreementBody], SharingAgreementResponse | undefined>;
  };
  outcomes: {
    edit: CapabilityOutcome;
    remove: CapabilityOutcome;
    configureHuawei: CapabilityOutcome;
    createSharingAgreement: CapabilityOutcome;
  };
}

export interface PlantActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forPlant: (plant: PlantResponse | undefined) => PlantRowActions;
}

export function usePlantActions(): PlantActions {
  const queryClient = useQueryClient();
  const activeCommunityId = useActiveCommunity();

  const updateMutation = useUpdatePlant();
  const deleteMutation = useDeletePlant();
  const configureHuaweiMutation = useConfigureHuawei();
  const createAgreementMutation = useCreateSharingAgreement();

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetAllPlantsQueryKey(activeCommunityId ?? "") });

  return {
    forPlant: (plant) => {
      const plantId = plant?.id ?? "";
      const capabilities = plant?.capabilities;

      const manage = outcomeFromResource(capabilities, "canManage");
      const manageAgreements = outcomeFromResource(capabilities, "canManageSharingAgreements");

      return {
        actions: {
          edit: grant(
            manage,
            async (data: UpdatePlantBody) => {
              try {
                await updateMutation.mutateAsync({ plantId, data });
                queryClient.invalidateQueries({ queryKey: getGetPlantByIdQueryKey(plantId) });
                invalidateList();
                return true;
              } catch {
                return false;
              }
            },
            updateMutation.isPending,
          ),
          remove: grant(
            manage,
            async () => {
              try {
                await deleteMutation.mutateAsync({ plantId });
                // Removed, not invalidated: the plant no longer exists, so an
                // invalidation-triggered refetch would 404 straight after a
                // successful delete. Same reasoning as the agreement delete in
                // useSharingAgreementMutations.
                queryClient.removeQueries({ queryKey: getGetPlantByIdQueryKey(plantId) });
                invalidateList();
                return true;
              } catch {
                return false;
              }
            },
            deleteMutation.isPending,
          ),
          configureHuawei: grant(
            manage,
            async (data: ConfigureHuaweiBody): Promise<HuaweiWriteResult> => {
              try {
                await configureHuaweiMutation.mutateAsync({ plantId, data });
                queryClient.invalidateQueries({ queryKey: getGetHuaweiConfigQueryKey(plantId) });
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            configureHuaweiMutation.isPending,
          ),
          createSharingAgreement: grant(
            manageAgreements,
            async (data: CreateSharingAgreementBody) => {
              try {
                const agreement = await createAgreementMutation.mutateAsync({ plantId, data });
                queryClient.invalidateQueries({ queryKey: getGetSharingAgreementsQueryKey(plantId) });
                return agreement;
              } catch {
                return undefined;
              }
            },
            createAgreementMutation.isPending,
          ),
        },
        outcomes: {
          edit: manage,
          remove: manage,
          configureHuawei: manage,
          createSharingAgreement: manageAgreements,
        },
      };
    },
  };
}
