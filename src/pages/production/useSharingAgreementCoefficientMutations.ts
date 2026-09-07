import { useQueryClient } from "@tanstack/react-query";
import {
  getGetSharingAgreementPartitionCoefficientsQueryKey,
  useReplacePartitionCoefficients,
} from "../../api/sharing-agreements/sharing-agreements";
import { useErrorDispatch } from "../../context/error.context";
import { getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";
import type { EditableCoefficientRow } from "./sharingAgreementCoefficientEditing";

export interface ReplaceCoefficientsResult {
  success: boolean;
}

export interface SharingAgreementCoefficientMutations {
  replaceCoefficients: (sharingAgreementId: string, rows: EditableCoefficientRow[]) => Promise<ReplaceCoefficientsResult>;
  isReplacing: boolean;
}

export function useSharingAgreementCoefficientMutations(plantId: string): SharingAgreementCoefficientMutations {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const replaceMutation = useReplacePartitionCoefficients();

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

  return { replaceCoefficients, isReplacing: replaceMutation.isPending };
}
