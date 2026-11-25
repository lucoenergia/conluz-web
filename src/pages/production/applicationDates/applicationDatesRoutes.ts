/** The query parameter that says the flow was opened from observed sharing, and its value. */
const FROM_PARAM = "desde";
export const APPLICATION_DATES_FROM_OBSERVED = "reparto-observado";

/**
 * Where an agreement's application dates are set (#419). From observed
 * sharing, the dates start from what it observed (UI-AGR-032).
 */
export const applicationDatesPath = (plantId: string, sharingAgreementId: string, options?: { fromObserved?: boolean }) =>
  `/plants/${plantId}/sharing-agreements/${sharingAgreementId}/application-dates${
    options?.fromObserved ? `?${FROM_PARAM}=${APPLICATION_DATES_FROM_OBSERVED}` : ""
  }`;

export const isFromObserved = (searchParams: URLSearchParams) =>
  searchParams.get(FROM_PARAM) === APPLICATION_DATES_FROM_OBSERVED;
