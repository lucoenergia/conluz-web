import { getIndexedApiErrorDetails } from "../../errors/apiErrorCatalogue";
import { isNetworkFailure } from "../../errors/networkFailure";
import {
  CONTACT_CHANNEL_CODE_FIELD,
  sentFieldLength,
  type ContactChannelDraft,
  type ContactChannelErrors,
} from "../../utils/contactChannelRules";

/** How a refused save of the contact channels is shown (#296). */
export type ContactSaveRefusal =
  /** No answer from the server: the save can be repeated as it is. */
  | { kind: "offline" }
  /** A 403 or 404: the caller no longer administers the community, or can no longer see it. */
  | { kind: "lostRights" }
  /** A 400 about the channel being edited, placed on its fields. */
  | { kind: "fields"; errors: ContactChannelErrors }
  /** Anything else, shown at the top of the editor. */
  | { kind: "server" };

/**
 * Where a refused save goes. Every save sends the whole list, but the admin
 * edits one channel at a time: a 400 names each broken rule and, by its
 * position in the list sent, the channel it is about. A refusal about the
 * channel being edited goes on its fields, with the length it has and its type
 * filled in from what was sent, because the backend sends neither. A refusal
 * about another channel, or about none, cannot be fixed from this editor, so it
 * is shown as the server refusing the save.
 */
export function contactSaveRefusal(error: unknown, sent: ContactChannelDraft[], editedIndex?: number): ContactSaveRefusal {
  if (isNetworkFailure(error)) return { kind: "offline" };
  const status = (error as { response?: { status?: number } } | null | undefined)?.response?.status;
  if (status === 403 || status === 404) return { kind: "lostRights" };
  if (status !== 400 || editedIndex === undefined) return { kind: "server" };

  const { formLevel, indexed } = getIndexedApiErrorDetails(error, (index, code) => {
    const channel = sent[index];
    const field = code ? CONTACT_CHANNEL_CODE_FIELD[code] : undefined;
    if (!channel) return {};
    return { type: channel.type, ...(field ? { n: String(sentFieldLength(channel, field)) } : {}) };
  });

  const errors: ContactChannelErrors = {};
  for (const detail of indexed) {
    const field = detail.code ? CONTACT_CHANNEL_CODE_FIELD[detail.code] : undefined;
    if (detail.index !== editedIndex || !field) return { kind: "server" };
    errors[field] ??= detail.message;
  }
  if (formLevel.length > 0 || Object.keys(errors).length === 0) return { kind: "server" };
  return { kind: "fields", errors };
}
