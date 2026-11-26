import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type {
  ConfigureHuaweiBody,
  CreateSharingAgreementBody,
  GetPlantSurplusClaimFileFormat,
  PlantResponse,
  SharingAgreementResponse,
  UpdatePlantBody,
} from "../../api/models";
import { useActiveCommunity } from "../../context/community.context";
import { withParsedBlobErrorBody } from "../../errors/blobErrorBody";
import { downloadPlantSurplusClaimFile } from "../../pages/production/surplusClaim/downloadPlantSurplusClaimFile";
import { triggerBrowserDownload } from "../../utils/triggerBrowserDownload";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * What the caller may do with one plant.
 *
 * `edit`, `remove`, `configureHuawei`, `enableHuawei` and `disableHuawei` share
 * `canManage`: its doc covers "update or delete this plant, and read and write
 * its Huawei configuration". One answer, five actions. `enableHuawei` and
 * `disableHuawei` are an opposite pair, both handed over to a caller who may do
 * either: the stored configuration's `enabled` picks the one that applies.
 *
 * `downloadSurplusClaim` shares it too: the surplus claim and its file are
 * read only by the plant's managers (#455).
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

/**
 * A plant deletion: success, or the refusal itself rather than a bare `false`.
 * A plant that holds the community's sharing history is refused with a code of
 * its own (lucoenergia/conluz#437), which the screen words apart from any
 * other failure (#290).
 */
export type PlantDeleteResult = { ok: true } | { error: unknown };

/**
 * A plant edit: success, or the refusal itself rather than a bare `false`, so
 * the screen can word a refusal by its code.
 */
export type PlantEditResult = { ok: true } | { error: unknown };

/**
 * A surplus claim file download: saved, or the refusal itself, its Blob body
 * already parsed, so the screen can tell SURPLUS_CLAIM_CIL_REQUIRED from any
 * other failure (#455).
 */
export type SurplusClaimDownloadResult = { ok: true } | { error: unknown };

export interface PlantRowActions {
  actions: {
    edit: MaybeAction<[UpdatePlantBody], PlantEditResult>;
    remove: MaybeAction<[], PlantDeleteResult>;
    configureHuawei: MaybeAction<[ConfigureHuaweiBody], HuaweiWriteResult>;
    enableHuawei: MaybeAction<[], HuaweiWriteResult>;
    disableHuawei: MaybeAction<[], HuaweiWriteResult>;
    createSharingAgreement: MaybeAction<[CreateSharingAgreementBody], SharingAgreementResponse | undefined>;
    downloadSurplusClaim: MaybeAction<[string, GetPlantSurplusClaimFileFormat], SurplusClaimDownloadResult>;
  };
  outcomes: {
    edit: CapabilityOutcome;
    remove: CapabilityOutcome;
    configureHuawei: CapabilityOutcome;
    enableHuawei: CapabilityOutcome;
    disableHuawei: CapabilityOutcome;
    createSharingAgreement: CapabilityOutcome;
    downloadSurplusClaim: CapabilityOutcome;
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
  const enableHuaweiMutation = useEnableHuaweiConfig();
  const disableHuaweiMutation = useDisableHuaweiConfig();
  const createAgreementMutation = useCreateSharingAgreement();
  // Not a generated hook: the generated getPlantSurplusClaimFile discards
  // Content-Disposition, so the file goes through AXIOS_INSTANCE directly. It
  // is an action anyway, as the sharing agreement file is: canManage decides it.
  const downloadSurplusClaimMutation = useMutation({
    mutationFn: (variables: { plantId: string; month: string; format: GetPlantSurplusClaimFileFormat }) =>
      downloadPlantSurplusClaimFile(variables.plantId, variables.month, variables.format),
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetAllPlantsQueryKey(activeCommunityId ?? "") });

  return {
    forPlant: (plant) => {
      const plantId = plant?.id ?? "";
      const capabilities = plant?.capabilities;

      const manage = outcomeFromResource(capabilities, "canManage");
      const manageAgreements = outcomeFromResource(capabilities, "canManageSharingAgreements");

      // Only this plant's configuration is read back: another plant's is not
      // touched by a write to this one (#192). Today's inverter production is
      // read back with it: whether it is available follows the configuration
      // (UI-PLT-012).
      const writeHuawei = async (call: () => Promise<unknown>): Promise<HuaweiWriteResult> => {
        try {
          await call();
          queryClient.invalidateQueries({ queryKey: getGetHuaweiConfigQueryKey(plantId) });
          queryClient.invalidateQueries({ queryKey: getGetPlantInverterProductionTodayQueryKey(plantId) });
          return { ok: true };
        } catch (error) {
          return { error };
        }
      };

      return {
        actions: {
          edit: grant(
            manage,
            async (data: UpdatePlantBody): Promise<PlantEditResult> => {
              try {
                await updateMutation.mutateAsync({ plantId, data });
                queryClient.invalidateQueries({ queryKey: getGetPlantByIdQueryKey(plantId) });
                // Every month of the claim: it carries the plant's CIL (#455).
                // No params, so the key is a prefix that matches each of them.
                queryClient.invalidateQueries({ queryKey: getGetPlantSurplusClaimQueryKey(plantId) });
                invalidateList();
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            updateMutation.isPending,
          ),
          remove: grant(
            manage,
            async (): Promise<PlantDeleteResult> => {
              try {
                await deleteMutation.mutateAsync({ plantId });
                // Removed, not invalidated: the plant no longer exists, so an
                // invalidation-triggered refetch would 404 straight after a
                // successful delete. Same reasoning as the agreement delete in
                // useSharingAgreementMutations. Only an inactive one: the plant's
                // own detail, deleting it, still observes it until it navigates
                // away, and would refetch a removed query straight into that 404.
                queryClient.removeQueries({ queryKey: getGetPlantByIdQueryKey(plantId), type: "inactive" });
                invalidateList();
                return { ok: true };
              } catch (error) {
                return { error };
              }
            },
            deleteMutation.isPending,
          ),
          configureHuawei: grant(
            manage,
            (data: ConfigureHuaweiBody) => writeHuawei(() => configureHuaweiMutation.mutateAsync({ plantId, data })),
            configureHuaweiMutation.isPending,
          ),
          enableHuawei: grant(
            manage,
            () => writeHuawei(() => enableHuaweiMutation.mutateAsync({ plantId })),
            enableHuaweiMutation.isPending,
          ),
          disableHuawei: grant(
            manage,
            () => writeHuawei(() => disableHuaweiMutation.mutateAsync({ plantId })),
            disableHuaweiMutation.isPending,
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
          downloadSurplusClaim: grant(
            manage,
            async (month: string, format: GetPlantSurplusClaimFileFormat): Promise<SurplusClaimDownloadResult> => {
              try {
                const { blob, filename } = await downloadSurplusClaimMutation.mutateAsync({ plantId, month, format });
                triggerBrowserDownload(blob, filename);
                return { ok: true };
              } catch (error) {
                // The request asks for a Blob, so a refusal's typed body is a Blob too.
                return { error: await withParsedBlobErrorBody(error) };
              }
            },
            downloadSurplusClaimMutation.isPending,
          ),
        },
        outcomes: {
          edit: manage,
          remove: manage,
          configureHuawei: manage,
          enableHuawei: manage,
          disableHuawei: manage,
          createSharingAgreement: manageAgreements,
          downloadSurplusClaim: manage,
        },
      };
    },
  };
}
