import type { MembershipResponse } from "../../api/models";

/** Where the roster the picker offers stands. */
export type MemberPickerStatus = "loading" | "ready" | "error";

/** The options a picker offers once its exclusion is applied. */
export function memberPickerOptions(
  options: MembershipResponse[],
  exclude?: (membership: MembershipResponse) => boolean,
): MembershipResponse[] {
  return exclude ? options.filter((membership) => !exclude(membership)) : options;
}

/**
 * A roster that has not loaded, failed, or leaves nobody to offer: there is no
 * member to choose, so the form that holds the picker cannot be sent
 * (UI-SUP-017).
 */
export function isMemberPickerUnavailable(status: MemberPickerStatus, offered: readonly MembershipResponse[]): boolean {
  return status !== "ready" || offered.length === 0;
}
