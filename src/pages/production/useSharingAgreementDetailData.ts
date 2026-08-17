import { useGetSharingAgreementById, useGetSharingAgreementPartitionCoefficients } from "../../api/sharing-agreements/sharing-agreements";
import { useGetPlantById } from "../../api/plants/plants";
import type { PlantResponse, SharingAgreementPartitionCoefficientResponse, SharingAgreementResponse } from "../../api/models";
import { isNotFoundError } from "./useSharingAgreementsData";

export interface SharingAgreementDetailData {
  agreement?: SharingAgreementResponse;
  plant?: PlantResponse;
  coefficients: SharingAgreementPartitionCoefficientResponse[];
  isLoading: boolean;
  isNotFound: boolean;
  error: unknown;
}

export function useSharingAgreementDetailData(plantId: string, sharingAgreementId: string): SharingAgreementDetailData {
  const {
    data: agreement,
    isLoading: isLoadingAgreement,
    error: agreementError,
  } = useGetSharingAgreementById(plantId, sharingAgreementId);

  const {
    data: coefficients = [],
    isLoading: isLoadingCoefficients,
    error: coefficientsError,
  } = useGetSharingAgreementPartitionCoefficients(plantId, sharingAgreementId);

  const {
    data: plant,
    isLoading: isLoadingPlant,
    error: plantError,
  } = useGetPlantById(plantId);

  const notFound = isNotFoundError(agreementError) || isNotFoundError(coefficientsError) || isNotFoundError(plantError);

  return {
    agreement,
    plant,
    coefficients,
    isLoading: isLoadingAgreement || isLoadingCoefficients || isLoadingPlant,
    isNotFound: notFound,
    error: notFound ? null : (agreementError ?? coefficientsError ?? plantError),
  };
}
