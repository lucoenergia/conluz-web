import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSharingAgreementByIdQueryKey,
  getGetSharingAgreementsQueryKey,
  useCreateSharingAgreement,
  useDeleteSharingAgreement,
  useUpdateSharingAgreement,
} from "../../api/sharing-agreements/sharing-agreements";
import type { CreateSharingAgreementBody, SharingAgreementResponse, UpdateSharingAgreementBody } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

export interface SharingAgreementMutations {
  createAgreement: (data: CreateSharingAgreementBody) => Promise<SharingAgreementResponse | undefined>;
  updateAgreement: (sharingAgreementId: string, data: UpdateSharingAgreementBody) => Promise<boolean>;
  deleteAgreement: (sharingAgreementId: string) => Promise<boolean>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useSharingAgreementMutations(plantId: string): SharingAgreementMutations {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();

  const createMutation = useCreateSharingAgreement();
  const updateMutation = useUpdateSharingAgreement();
  const deleteMutation = useDeleteSharingAgreement();

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetSharingAgreementsQueryKey(plantId) });

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

  return {
    createAgreement,
    updateAgreement,
    deleteAgreement,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
