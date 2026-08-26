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
  /** Informational only — the save succeeded even when this is present. */
  sumWarning?: string;
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
      const response = await replaceMutation.mutateAsync({
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
      return { success: true, sumWarning: response.coefficientSumWarning ?? undefined };
    } catch (error) {
      errorDispatch(
        getFirstApiErrorMessage(error, "Ha habido un problema al guardar los coeficientes. Por favor, inténtalo más tarde"),
      );
      return { success: false };
    }
  };

  return { replaceCoefficients, isReplacing: replaceMutation.isPending };
}
