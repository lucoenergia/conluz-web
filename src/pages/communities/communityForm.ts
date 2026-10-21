import { getFirstApiErrorCode, getFirstApiErrorMessage } from "../../errors/apiErrorCatalogue";

/** The community form's inputs an API refusal can name. */
export type CommunityField = "code" | "legalId";

export type CommunityRefusal = { field: CommunityField; message: string } | { form: string };

const isCommunityField = (value: string | undefined): value is CommunityField =>
  value === "code" || value === "legalId";

function firstErrorField(error: unknown): string | undefined {
  return (error as { response?: { data?: { errors?: { params?: Record<string, string> | null }[] } } } | null)
    ?.response?.data?.errors?.[0]?.params?.field;
}

/**
 * Where a refused community create or edit is shown (#232). COMMUNITY_ALREADY_EXISTS
 * goes on the input its `field` names; without a known field, its catalogue text
 * goes where the page shows errors. Every other refusal keeps the page's own
 * `generic` message.
 */
export function communityRefusalOf(error: unknown, generic: string): CommunityRefusal {
  if (getFirstApiErrorCode(error) !== "COMMUNITY_ALREADY_EXISTS") return { form: generic };
  const message = getFirstApiErrorMessage(error, generic);
  const field = firstErrorField(error);
  return isCommunityField(field) ? { field, message } : { form: message };
}
