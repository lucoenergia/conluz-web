import type { CommunityResponse } from "../../api/models";

/** What the community form holds, one string per input. */
export interface CommunityFieldValues {
  name: string;
  code: string;
  legalId: string;
  address: string;
}

/** The community form's inputs. */
export type CommunityFormInput = keyof CommunityFieldValues;

export const EMPTY_COMMUNITY_FIELD_VALUES: CommunityFieldValues = {
  name: "",
  code: "",
  legalId: "",
  address: "",
};

/** A community's own values, as the form shows them. */
export const communityFieldValuesOf = (community: CommunityResponse): CommunityFieldValues => ({
  name: community.name ?? "",
  code: community.code ?? "",
  legalId: community.legalId ?? "",
  address: community.address ?? "",
});

export const NAME_REQUIRED = "El nombre es obligatorio";
export const CODE_REQUIRED = "El código es obligatorio";

/** Each input that is wrong and why, in the order the form shows them. */
export function communityFieldErrors(values: CommunityFieldValues): [CommunityFormInput, string][] {
  const errors: [CommunityFormInput, string][] = [];
  if (!values.name.trim()) errors.push(["name", NAME_REQUIRED]);
  if (!values.code.trim()) errors.push(["code", CODE_REQUIRED]);
  return errors;
}
