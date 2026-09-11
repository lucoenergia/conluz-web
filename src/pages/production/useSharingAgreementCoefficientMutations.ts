import { useState } from "react";
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

  // Each underlying mutation's own isPending flips false the instant its HTTP
  // response arrives — well before the invalidation-triggered refetch below
  // has delivered fresh data. Acting again in that window (e.g. reopening a
  // row's menu and firing another lifecycle action) would target stale
  // applicationState/endState: the endpoints can't reject it, since e.g.
  // activating an already-applied coefficient is a legal *correction*, not
  // an error — so the request would silently mean something the user didn't
  // intend. These flags span the whole call, success or failure, through the
  // awaited invalidation, and are OR-combined with the raw mutation flag
  // (never replacing it) so anything driving that flag directly keeps working.
  const [isActivatingAfterInvalidate, setIsActivatingAfterInvalidate] = useState(false);
  const [isDeactivatingAfterInvalidate, setIsDeactivatingAfterInvalidate] = useState(false);
  const [isClosingAfterInvalidate, setIsClosingAfterInvalidate] = useState(false);
  const [isReopeningAfterInvalidate, setIsReopeningAfterInvalidate] = useState(false);

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
   *
   * Returns the promise `invalidateQueries` returns — which resolves only
   * once every matching *active* query has actually refetched, not merely
   * once they're marked stale. Callers must await it before treating the
   * mutation as fully settled; skipping the await was the whole bug this
   * flag exists to fix (see isActivatingAfterInvalidate above).
   */
  const invalidatePlantSharingAgreements = () => {
    return queryClient.invalidateQueries({
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
    setIsActivatingAfterInvalidate(true);
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
      await invalidatePlantSharingAgreements();
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
    } finally {
      setIsActivatingAfterInvalidate(false);
    }
  };

  const deactivateCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
  ): Promise<CoefficientActivationResult> => {
    setIsDeactivatingAfterInvalidate(true);
    try {
      await deactivateMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
      await invalidatePlantSharingAgreements();
      successDispatch("Activación revertida.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    } finally {
      setIsDeactivatingAfterInvalidate(false);
    }
  };

  const closeCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
    closedOn: Dayjs,
  ): Promise<CoefficientActivationResult> => {
    setIsClosingAfterInvalidate(true);
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
      await invalidatePlantSharingAgreements();
      successDispatch("Cierre registrado.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    } finally {
      setIsClosingAfterInvalidate(false);
    }
  };

  const reopenCoefficients = async (
    sharingAgreementId: string,
    coefficientIds: string[],
  ): Promise<CoefficientActivationResult> => {
    setIsReopeningAfterInvalidate(true);
    try {
      await reopenMutation.mutateAsync({ plantId, sharingAgreementId, data: { coefficientIds } });
      await invalidatePlantSharingAgreements();
      successDispatch("Coeficiente reabierto.");
      return { success: true };
    } catch (error) {
      return { success: false, errorMessages: getGroupedApiErrorDetails(error).fileLevel };
    } finally {
      setIsReopeningAfterInvalidate(false);
    }
  };

  return {
    replaceCoefficients,
    activateCoefficients,
    deactivateCoefficients,
    closeCoefficients,
    reopenCoefficients,
    isReplacing: replaceMutation.isPending,
    isActivating: activateMutation.isPending || isActivatingAfterInvalidate,
    isDeactivating: deactivateMutation.isPending || isDeactivatingAfterInvalidate,
    isClosing: closeMutation.isPending || isClosingAfterInvalidate,
    isReopening: reopenMutation.isPending || isReopeningAfterInvalidate,
  };
}
