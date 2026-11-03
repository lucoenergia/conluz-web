type NameableSupply = { name?: string | null; address?: string | null; code: string };

/** Which of a supply's fields names it (UI-SUP-010). */
export type SupplyLabelSource = "name" | "address" | "code";

/**
 * Which field names a supply wherever it is shown or searched (UI-SUP-010):
 * its name, or its address when it has none, or its CUPS when the payload
 * carries no address either. A blank value counts as none.
 *
 * A supply's name is optional, so a supply created without one must still be
 * recognisable. A supply reference (SupplyReferenceResponse) carries no
 * address, so a reference falls back to the CUPS.
 *
 * Exposed so a screen that also shows the address or the CUPS can tell when
 * the label already is that value, and not show it twice.
 */
export function supplyLabelSource(supply: NameableSupply): SupplyLabelSource {
  if (supply.name?.trim()) return "name";
  if (supply.address?.trim()) return "address";
  return "code";
}

/** How a supply is named: the value of the field `supplyLabelSource` picks. */
export function supplyDisplayLabel(supply: NameableSupply): string {
  switch (supplyLabelSource(supply)) {
    case "name":
      return supply.name!.trim();
    case "address":
      return supply.address!.trim();
    case "code":
      return supply.code;
  }
}
