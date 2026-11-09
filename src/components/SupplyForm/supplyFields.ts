import type { MembershipResponse } from "../../api/models";

/**
 * The owner input, as the screen supplies it. The fields fetch nothing
 * themselves: creating chooses among the active community's memberships, and
 * editing only shows the owner the supply already has (UI-SUP-016, UI-SUP-018).
 */
export type SupplyOwnerField =
  | { mode: "choose"; status: "loading" | "ready" | "error"; options: MembershipResponse[] }
  | { mode: "show"; fullName: string | null };

/** The inputs an API refusal can be shown on. */
export type SupplyFormField = "cups" | "personalId";

/** What the fields hold. The owner is the chosen membership's id, `null` for none. */
export interface SupplyFieldValues {
  name: string;
  cups: string;
  address: string;
  addressRef: string;
  ownerId: string | null;
}

export const EMPTY_SUPPLY_FIELD_VALUES: SupplyFieldValues = {
  name: "",
  cups: "",
  address: "",
  addressRef: "",
  ownerId: null,
};

/**
 * The chosen membership, resolved against the options on every render: a list
 * for another community does not hold it, so the selection clears itself.
 */
export function selectedOwnerOf(owner: SupplyOwnerField | undefined, ownerId: string | null): MembershipResponse | null {
  if (owner?.mode !== "choose") return null;
  return owner.options.find((membership) => membership.id === ownerId) ?? null;
}

/**
 * A community with no members, or whose members could not be read, has no
 * owner to offer, so the form cannot be sent (UI-SUP-017).
 */
export function isOwnerUnavailable(owner: SupplyOwnerField | undefined): boolean {
  return owner?.mode === "choose" && (owner.status !== "ready" || owner.options.length === 0);
}
