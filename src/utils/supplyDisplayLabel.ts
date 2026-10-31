/**
 * How a supply is named wherever it is shown or searched (UI-SUP-010): its
 * name, or its address when it has none, or its CUPS when the payload carries
 * no address either.
 *
 * A supply's name is optional, so a supply created without one must still be
 * recognisable. A supply reference (SupplyReferenceResponse) carries no
 * address, so a reference falls back to the CUPS.
 */
export function supplyDisplayLabel(supply: { name?: string | null; address?: string | null; code: string }): string {
  return supply.name?.trim() || supply.address?.trim() || supply.code;
}
