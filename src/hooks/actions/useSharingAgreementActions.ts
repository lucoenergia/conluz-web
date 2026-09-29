import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  getGetSharingAgreementsQueryKey,
  useDeleteSharingAgreement,
  useGenerateSharingAgreementDistributorFile,
  usePublishSharingAgreement,
  useRevertSharingAgreementToDraft,
  useUpdateSharingAgreement,
  useUploadSharingAgreementFile,
} from "../../api/sharing-agreements/sharing-agreements";
import type { SharingAgreementResponse, UpdateSharingAgreementBody } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { getFirstApiErrorMessage, getGroupedApiErrorDetails, type GroupedApiErrors } from "../../errors/apiErrorCatalogue";
import {
  downloadSharingAgreementFile,
  triggerBrowserDownload,
} from "../../components/SharingAgreementFilePanel/downloadSharingAgreementFile";
import { outcomeFromResource, type CapabilityOutcome } from "../permissions";
import { grant, type MaybeAction } from "./action";

/**
 * Importing a TXT fails in two shapes the dialog renders differently: a 400
 * carries one detail per rejected line, which belongs in a persistent work
 * list, while anything else is a single toast this layer has already
 * dispatched. `groupedErrors: null` means "already reported".
 */
export type SharingAgreementFileUploadResult =
  | { success: true }
  | { success: false; groupedErrors: GroupedApiErrors | null };

/**
 * What the caller may do with one sharing agreement.
 *
 * Every write gates on the agreement's `canManage` -- the only write flag it
 * has. Its own doc says so, and says that whether a particular one is possible
 * *right now* also depends on the status, which it does not reflect: capability
 * answers "may this person, ever", the screen keeps answering "is this legal in
 * this status". Both, in that order, never one standing in for the other.
 *
 * `downloadFile` gates on `canRead`. That is the same rule as `canManage`
 * today, and every endpoint returning an agreement already demands it, so no
 * caller can observe a false here -- but reading the file is the decision
 * `canRead` names, and gating it on the write flag would be a rule this API
 * does not have.
 *
 * Creating an agreement is not here: it is authorised by the plant, so it lives
 * on usePlantActions().forPlant(plant).actions.createSharingAgreement.
 */
export interface SharingAgreementRowActions {
  actions: {
    update: MaybeAction<[UpdateSharingAgreementBody], boolean>;
    remove: MaybeAction<[], boolean>;
    publish: MaybeAction<[], boolean>;
    revertToDraft: MaybeAction<[], boolean>;
    uploadFile: MaybeAction<[File], SharingAgreementFileUploadResult>;
    generateFile: MaybeAction<[number], Blob | undefined>;
    downloadFile: MaybeAction<[], boolean>;
  };
  outcomes: Record<keyof SharingAgreementRowActions["actions"], CapabilityOutcome>;
}

export interface SharingAgreementActions {
  /** See useMembershipActions for why this is a plain function and not a hook. */
  forAgreement: (agreement: SharingAgreementResponse | undefined) => SharingAgreementRowActions;
}

export function useSharingAgreementActions(plantId: string): SharingAgreementActions {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const successDispatch = useSuccessDispatch();

  const updateMutation = useUpdateSharingAgreement();
  const deleteMutation = useDeleteSharingAgreement();
  const publishMutation = usePublishSharingAgreement();
  const revertMutation = useRevertSharingAgreementToDraft();
  const uploadMutation = useUploadSharingAgreementFile();
  const generateMutation = useGenerateSharingAgreementDistributorFile();
  // Not a generated hook -- the generated useGetSharingAgreementFile types the
  // body as `string` and would corrupt the bytes, so the download goes through
  // AXIOS_INSTANCE directly. It is wrapped here anyway: the panel that used to
  // own this useMutation should not keep mutation plumbing once every one of
  // its siblings is an Action, and `canRead` is a decision, not a formality.
  const downloadMutation = useMutation({
    mutationFn: (variables: { sharingAgreementId: string }) =>
      downloadSharingAgreementFile(plantId, variables.sharingAgreementId),
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetSharingAgreementsQueryKey(plantId) });

  const invalidateAfterLifecycleTransition = (sharingAgreementId: string) => {
    queryClient.invalidateQueries({ queryKey: getGetSharingAgreementByIdQueryKey(plantId, sharingAgreementId) });
    queryClient.invalidateQueries({
      queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey(plantId, sharingAgreementId),
    });
    invalidateList();
  };

  return {
    forAgreement: (agreement) => {
      const sharingAgreementId = agreement?.id ?? "";
      const capabilities = agreement?.capabilities;

      const manage = outcomeFromResource(capabilities, "canManage");
      const read = outcomeFromResource(capabilities, "canRead");

      const update = async (data: UpdateSharingAgreementBody) => {
        try {
          await updateMutation.mutateAsync({ plantId, sharingAgreementId, data });
          queryClient.invalidateQueries({ queryKey: getGetSharingAgreementByIdQueryKey(plantId, sharingAgreementId) });
          invalidateList();
          return true;
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(
              error,
              "Ha habido un problema al actualizar el acuerdo de reparto. Por favor, inténtalo más tarde",
            ),
          );
          return false;
        }
      };

      const remove = async () => {
        try {
          await deleteMutation.mutateAsync({ plantId, sharingAgreementId });
          // Removed, not invalidated: the agreement no longer exists server-side,
          // so an invalidation-triggered refetch would 404 and fire an error toast
          // right after a successful delete.
          queryClient.removeQueries({ queryKey: getGetSharingAgreementByIdQueryKey(plantId, sharingAgreementId) });
          invalidateList();
          successDispatch("Acuerdo de reparto eliminado correctamente");
          return true;
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(
              error,
              "Ha habido un problema al eliminar el acuerdo de reparto. Por favor, inténtalo más tarde",
            ),
          );
          return false;
        }
      };

      const publish = async () => {
        try {
          await publishMutation.mutateAsync({ plantId, sharingAgreementId });
          invalidateAfterLifecycleTransition(sharingAgreementId);
          return true;
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(
              error,
              "Ha habido un problema al poner en vigor el acuerdo de reparto. Por favor, inténtalo más tarde",
            ),
          );
          return false;
        }
      };

      const revertToDraft = async () => {
        try {
          await revertMutation.mutateAsync({ plantId, sharingAgreementId });
          invalidateAfterLifecycleTransition(sharingAgreementId);
          return true;
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(
              error,
              "Ha habido un problema al volver el acuerdo de reparto a borrador. Por favor, inténtalo más tarde",
            ),
          );
          return false;
        }
      };

      const uploadFile = async (file: File): Promise<SharingAgreementFileUploadResult> => {
        try {
          await uploadMutation.mutateAsync({ plantId, sharingAgreementId, data: { file } });
          queryClient.invalidateQueries({
            queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey(plantId, sharingAgreementId),
          });
          queryClient.invalidateQueries({ queryKey: getGetSharingAgreementByIdQueryKey(plantId, sharingAgreementId) });
          return { success: true };
        } catch (error) {
          if ((error as { response?: { status?: number } } | null | undefined)?.response?.status === 400) {
            return { success: false, groupedErrors: getGroupedApiErrorDetails(error) };
          }
          errorDispatch(
            getFirstApiErrorMessage(error, "Ha habido un problema al subir el fichero. Por favor, inténtalo más tarde"),
          );
          return { success: false, groupedErrors: null };
        }
      };

      const generateFile = async (year: number) => {
        try {
          return await generateMutation.mutateAsync({ plantId, sharingAgreementId, data: { year } });
        } catch (error) {
          errorDispatch(
            getFirstApiErrorMessage(error, "Ha habido un problema al generar el fichero. Por favor, inténtalo más tarde"),
          );
          return undefined;
        }
      };

      const downloadFile = async () => {
        try {
          const { blob, filename } = await downloadMutation.mutateAsync({ sharingAgreementId });
          triggerBrowserDownload(blob, filename);
          return true;
        } catch {
          errorDispatch("Ha habido un problema al descargar el fichero. Por favor, inténtalo más tarde");
          return false;
        }
      };

      return {
        actions: {
          update: grant(manage, update, updateMutation.isPending),
          remove: grant(manage, remove, deleteMutation.isPending),
          publish: grant(manage, publish, publishMutation.isPending),
          revertToDraft: grant(manage, revertToDraft, revertMutation.isPending),
          uploadFile: grant(manage, uploadFile, uploadMutation.isPending),
          generateFile: grant(manage, generateFile, generateMutation.isPending),
          downloadFile: grant(read, downloadFile, downloadMutation.isPending),
        },
        outcomes: {
          update: manage,
          remove: manage,
          publish: manage,
          revertToDraft: manage,
          uploadFile: manage,
          generateFile: manage,
          downloadFile: read,
        },
      };
    },
  };
}
