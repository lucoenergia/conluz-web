/** Where a plant's observed sharing lives, within its sharing agreements. */
export const observedSharingPath = (plantId: string) => `/plants/${plantId}/sharing-agreements/observed`;

/** One agreement's observation, a slice of the plant's. */
export const agreementObservationPath = (plantId: string, sharingAgreementId: string) =>
  `${observedSharingPath(plantId)}/${sharingAgreementId}`;
