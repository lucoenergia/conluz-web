/**
 * The only place a generated mutation hook may be imported.
 *
 * A generated mutation hook next to a button is a decision not taken: nothing
 * in the import says who may press it, so the answer was whatever the author
 * happened to remember. Here every mutation is paired with the capability the
 * backend answers on, and an action the caller may not perform is not returned
 * at all -- so a screen cannot render a control for one it did not receive.
 *
 * A lint rule enforces the boundary (GENERATED_MUTATION_HOOKS in
 * eslint.config.js, fed by a list regenerated with the Orval client), and
 * src/contracts/mutationHooks.spec.ts enforces that every one of the API's
 * non-GET operations has a recorded decision -- whether or not it has an action
 * hook yet.
 *
 * Queries are not restricted. Read through the generated hooks as before,
 * subject to the community-scope wrappers.
 */
export { type Action, type MaybeAction, type ActionBundle, grant, ungated } from "./action";

export { useCommunityActions } from "./useCommunityActions";
export { useMembershipActions } from "./useMembershipActions";
export { usePlantActions } from "./usePlantActions";
export { usePlatformActions } from "./usePlatformActions";
export { useProfileActions } from "./useProfileActions";
export { useSessionActions } from "./useSessionActions";
export {
  useSharingAgreementActions,
  type SharingAgreementActions,
  type SharingAgreementRowActions,
  type SharingAgreementFileUploadResult,
} from "./useSharingAgreementActions";
export {
  useSharingAgreementCoefficientActions,
  type SharingAgreementCoefficientActions,
  type SharingAgreementCoefficientRowActions,
  type CoefficientActivationResult,
  type ReplaceCoefficientsResult,
} from "./useSharingAgreementCoefficientActions";
export { useSupplyActions } from "./useSupplyActions";
export { useUserActions } from "./useUserActions";
