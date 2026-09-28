import type { SupplyReferenceResponse } from "../../api/models";

/**
 * `supply.name` is nullable — the contract now says so too, since
 * SupplyReferenceResponse types it `string | null` — and it is empty for most
 * production rows. Falling back to "-" left the
 * CUPS — the only thing that actually identifies a supply point to the
 * distributor — demoted to a caption under a dash.
 *
 * When there is no name the CUPS becomes the primary identifier, and it is not
 * repeated underneath: one row, one identity.
 */
export function getRowIdentity(supply: SupplyReferenceResponse | undefined) {
  const name = supply?.name?.trim();
  const code = supply?.code?.trim();
  if (name) return { primary: name, secondary: code || "-" };
  return { primary: code || "-", secondary: null };
}
