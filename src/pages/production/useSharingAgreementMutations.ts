import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  getGetSharingAgreementsQueryKey,
  useCreateSharingAgreement,
  useDeleteSharingAgreement,
  usePublishSharingAgreement,
  useRevertSharingAgreementToDraft,
  useUpdateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";
import type { CreateSharingAgreementBody, SharingAgreementResponse, UpdateSharingAgreementBody } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

export interface SharingAgreementMutations {
  createAgreement: (data: CreateSharingAgreementBody) => Promise<SharingAgreementResponse | undefined>;
  updateAgreement: (sharingAgreementId: string, data: UpdateSharingAgreementBody) => Promise<boolean>;
  deleteAgreement: (sharingAgreementId: string) => Promise<boolean>;
  publishAgreement: (sharingAgreementId: string) => Promise<boolean>;
  revertAgreementToDraft: (sharingAgreementId: string) => Promise<boolean>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isPublishing: boolean;
  isReverting: boolean;
}

export function useSharingAgreementMutations(plantId: string): SharingAgreementMutations {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const successDispatch = useSuccessDispatch();

  const createMutation = useCreateSharingAgreement();
  const updateMutation = useUpdateSharingAgreement();
  const deleteMutation = useDeleteSharingAgreement();
  const publishMutation = usePublishSharingAgreement();
  const revertMutation = useRevertSharingAgreementToDraft();

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetSharingAgreementsQueryKey(plantId) });

  const invalidateAfterLifecycleTransition = (sharingAgreementId: string) => {
    queryClient.invalidateQueries({ queryKey: getGetSharingAgreementByIdQueryKey(plantId, sharingAgreementId) });
    queryClient.invalidateQueries({
      queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey(plantId, sharingAgreementId),
    });
    invalidateList();
  };

  const createAgreement = async (data: CreateSharingAgreementBody) => {
    try {
      const response = await createMutation.mutateAsync({ plantId, data });
      invalidateList();
      return response;
    } catch (error) {
      errorDispatch(
        getFirstApiErrorMessage(error, "Ha habido un problema al crear el acuerdo de reparto. Por favor, inténtalo más tarde"),
      );
      return undefined;
    }
  };

  const updateAgreement = async (sharingAgreementId: string, data: UpdateSharingAgreementBody) => {
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

  const deleteAgreement = async (sharingAgreementId: string) => {
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

  const publishAgreement = async (sharingAgreementId: string) => {
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

  const revertAgreementToDraft = async (sharingAgreementId: string) => {
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

  return {
    createAgreement,
    updateAgreement,
    deleteAgreement,
    publishAgreement,
    revertAgreementToDraft,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPublishing: publishMutation.isPending,
    isReverting: revertMutation.isPending,
  };
}
