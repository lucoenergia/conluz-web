import { useQueryClient } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  useActivatePartitionCoefficients,
  useClosePartitionCoefficients,
  useDeactivatePartitionCoefficients,
  useReopenPartitionCoefficients,
  useReplacePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { useErrorDispatch } from "../../context/error.context";
import { useSuccessDispatch } from "../../context/success.context";
import { getFirstApiErrorMessage, getGroupedApiErrorDetails } from "../../errors/apiErrorCatalogue";
import type { EditableCoefficientRow } from "./sharingAgreementCoefficientEditing";

export interface ReplaceCoefficientsResult {
  success: boolean;
}

export type CoefficientActivationResult = { success: true } | { success: false; errorMessages: string[] };

export interface SharingAgreementCoefficientMutations {
  replaceCoefficients: (sharingAgreementId: string, rows: EditableCoefficientRow[]) => Promise<ReplaceCoefficientsResult>;
  activateCoefficients: (
    sharingAgreementId: string,
    coefficientIds: string[],
    appliedOn: Dayjs,
  ) => Promise<CoefficientActivationResult>;
  deactivateCoefficients: (sharingAgreementId: string, coefficientIds: string[]) => Promise<CoefficientActivationResult>;
  closeCoefficients: (
    sharingAgreementId: string,
    coefficientIds: string[],
    closedOn: Dayjs,
  ) => Promise<CoefficientActivationResult>;
  reopenCoefficients: (sharingAgreementId: string, coefficientIds: string[]) => Promise<CoefficientActivationResult>;
  isReplacing: boolean;
  isActivating: boolean;
  isDeactivating: boolean;
  isClosing: boolean;
  isReopening: boolean;
}

export function useSharingAgreementCoefficientMutations(plantId: string): SharingAgreementCoefficientMutations {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const successDispatch = useSuccessDispatch();
  const replaceMutation = useReplacePartitionCoefficients();
  const activateMutation = useActivatePartitionCoefficients();
  const deactivateMutation = useDeactivatePartitionCoefficients();
  const closeMutation = useClosePartitionCoefficients();
  const reopenMutation = useReopenPartitionCoefficients();

  const replaceCoefficients = async (
    sharingAgreementId: string,
    rows: EditableCoefficientRow[],
  ): Promise<ReplaceCoefficientsResult> => {
    try {
      // Exactly one PUT per save — the endpoint replaces the whole set, so
      // this is called once with every row, never per keystroke or per row.
      // Reads each row's already-resolved canonical `value` directly — never
      // re-parses text, so this is unit-independent: the admin could have
      // typed in kW, percentage, or a mix across a toggle, and the payload is
      // identical either way.
      // coefficientSumWarning on the response is intentionally not surfaced: it's
      // useful to an API consumer with no UI, but on this screen the resulting
      // sum is already visible as persistent state in the coefficient-set KPI —
      // the backend sending a string doesn't oblige the UI to render it as a
      // one-off event too.
      await replaceMutation.mutateAsync({
        plantId,
        sharingAgreementId,
        data: {
          coefficients: rows.map((row) => ({
            supplyId: row.supplyId,
            coefficient: row.value!,
          })),
        },
      });
      queryClient.invalidateQueries({
        queryKey: getGetSharingAgreementPartitionCoefficientsQueryKey(plantId, sharingAgreementId),
      });
      return { success: true };
    } catch (error) {
      errorDispatch(
        getFirstApiErrorMessage(error, "Ha habido un problema al guardar los coeficientes. Por favor, inténtalo más tarde"),
      );
      return { success: false };
    }
  };

  /**
   * Invalidates every sharing-agreement query for this plant (list, every
   * cached agreement-by-id, every cached coefficient set) via a predicate on
   * the URL prefix, not a specific query key. Necessary because `activate`
   * cascades onto a predecessor coefficient that may belong to a *different*
   * agreement, and `PartitionCoefficientResponse` carries no
   * `sharingAgreementId` to map it back — there is no way to invalidate only
   * the "right" agreement, so the whole plant subtree is invalidated instead.
   * Agreements per plant are few and only mounted queries actually refetch,
   * so this is cheap.
   */
  const invalidatePlantSharingAgreements = () => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === "string" && key.startsWith(`/api/v1/plants/${plantId}/sharing-agreements`);
      },
    });
  };

  const activateCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
    appliedOn: Dayjs,
  ): Promise<CoefficientActivationResult> => {
    try {
      await activateMutation.mutateAsync({
        plantId,
        sharingAgreementId,
        data: {
          coefficientIds,
          // Never .toISOString()/.toJSON(): those convert to UTC first, and
          // local midnight in Madrid becomes 22:00/23:00 the *previous* day,
          // silently shifting appliedOn back one calendar day. This is the
          // date production gets attributed from, on data that reaches
          // billing — mirrors the hazard formatCalendarDate documents on the
          // read path (src/utils/formatCalendarDate.ts).
          appliedOn: appliedOn.format("YYYY-MM-DD"),
        },
      });
      invalidatePlantSharingAgreements();
      // A no-op batch (200, empty `coefficients` array in the response) is
      // still success: it's not an error, and the state the caller asked for
      // is the state that now holds. Not distinguished from a real batch —
      // the case is close to unreachable from this UI (checkboxes only ever
      // exist on already-PENDING rows), so the same confirmation applies.
      successDispatch("Fechas de aplicación registradas.");
      return { success: true };
    } catch (error) {
      // No errorDispatch/toast here: a batch rejection can carry several
      // details at once (one per failing coefficientId), and the caller
      // renders them as a persistent, readable work list instead of stacked
      // toasts that auto-dismiss before nine rows' worth of problems can be
      // read.
      // fileLevel is a general "ungrouped" bucket, not file-upload-specific
      // despite the name — it's just every detail whose params carry no
      // `line` key. Coefficient-lifecycle errors carry params.cups/
      // coefficientId, never params.line, so every one of them lands here;
      // lineLevel is always empty for this call.
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    }
  };

  const deactivateCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
  ): Promise<CoefficientActivationResult> => {
    try {
      await deactivateMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
      invalidatePlantSharingAgreements();
      successDispatch("Activación revertida.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    }
  };

  const closeCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
    closedOn: Dayjs,
  ): Promise<CoefficientActivationResult> => {
    try {
      await closeMutation.mutateAsync({
        plantId,
        sharingAgreementId,
        data: {
          coefficientIds,
          // Never .toISOString()/.toJSON(): same UTC-conversion hazard as
          // appliedOn above — this is the date production stops being
          // attributed from, on data that reaches billing.
          closedOn: closedOn.format("YYYY-MM-DD"),
        },
      });
      invalidatePlantSharingAgreements();
      successDispatch("Cierre registrado.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    }
  };

  const reopenCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
  ): Promise<CoefficientActivationResult> => {
    try {
      await reopenMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
      invalidatePlantSharingAgreements();
      successDispatch("Coeficiente reabierto.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    }
  };

  return {
    replaceCoefficients,
    activateCoefficients,
    deactivateCoefficients,
    closeCoefficients,
    reopenCoefficients,
    isReplacing: replaceMutation.isPending,
    isActivating: activateMutation.isPending,
    isDeactivating: deactivateMutation.isPending,
    isClosing: closeMutation.isPending,
    isReopening: reopenMutation.isPending,
  };
}
