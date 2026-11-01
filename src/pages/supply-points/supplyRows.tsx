import type { ReactNode } from "react";
import { Box, Chip, Typography } from "@mui/material";
import type { SupplyResponse } from "../../api/models";
import type { SupplyRowActions } from "../../hooks/actions/useSupplyActions";
import type { RecordListItem } from "../../components/RecordList";
import type { ListTableColumn, ListTableTitle } from "../../components/ListTable/ListTable";
import { fontFamilies } from "../../theme/tokens";
import { supplyDisplayLabel, supplyLabelSource } from "../../utils/supplyDisplayLabel";

/**
 * The supply list's two layouts, built from the same supply (#348). Only what
 * the payload carries is shown (UI-SUP-011): no consumption, no connection
 * time, no figure of any kind.
 *
 * `showOwner` is the active community's `canManage`, decided by the page: the
 * owner is useful to whoever manages the community, and redundant to a member,
 * who is only ever shown their own supplies.
 */
export interface SupplyRowOptions {
  showOwner: boolean;
}

/**
 * Whether a supply's row has a menu: an action the caller was given. "Ver"
 * does not count, because the row's title already links to the detail.
 */
export function offersSupplyRowActions({ actions }: SupplyRowActions): boolean {
  return !!(actions.edit || actions.disable || actions.enable || actions.remove);
}

export const supplyHref = (supply: SupplyResponse) => `/supply-points/${supply.id}`;

/**
 * The owner as the supply's community records them (UI-SUP-005): their name,
 * then their member number when the community records one.
 */
export function supplyOwnerText(supply: SupplyResponse): string {
  const owner = supply.ownerRecord;
  if (!owner) return "Sin titular";
  return owner.memberNumber ? `${owner.fullName} · Nº ${owner.memberNumber}` : owner.fullName;
}

const cupsText = (code: string) => (
  <Box component="span" sx={{ fontFamily: fontFamilies.mono }}>
    {code}
  </Box>
);

/**
 * A supply that has left the community. Neutral: colour is kept for failures,
 * and leaving is not one (UI-SUP-013). A span, so it may sit inside a line of text.
 */
const retiredChip = () => <Chip component="span" size="small" label="Dado de baja" sx={{ fontWeight: 600 }} />;

/**
 * The lines that say what the title does not: the CUPS unless the title is
 * the CUPS, and the address only when the title is the name, so neither value
 * is shown twice.
 */
function identifierLines(supply: SupplyResponse): { cups?: ReactNode; address?: ReactNode } {
  const source = supplyLabelSource(supply);
  return {
    cups: source === "code" ? undefined : cupsText(supply.code),
    address: source === "name" ? supply.address : undefined,
  };
}

/** The narrow layout's row. */
export function toRecordListItem(supply: SupplyResponse, { showOwner }: SupplyRowOptions): RecordListItem {
  const { cups, address } = identifierLines(supply);
  const lines: ReactNode[] = [];
  if (cups) lines.push(cups);
  if (showOwner) lines.push(`Titular: ${supplyOwnerText(supply)}`);
  if (address) lines.push(address);

  return {
    id: supply.id,
    title: supplyDisplayLabel(supply),
    href: supplyHref(supply),
    status: supply.enabled ? undefined : retiredChip(),
    inactive: !supply.enabled,
    lines,
  };
}

/** The wide layout's name column: the label, linked, with the status and the address under it. */
export const supplyTableTitle: ListTableTitle<SupplyResponse> = {
  header: "Punto de suministro",
  text: supplyDisplayLabel,
  href: supplyHref,
  // The status goes on the first line under the name: the title is plain text,
  // and a chip beside it would take the room the name needs.
  secondary: (supply) => {
    const { address } = identifierLines(supply);
    const lines: ReactNode[] = [];
    if (!supply.enabled) lines.push(retiredChip());
    if (address) lines.push(address);
    return lines;
  },
};

/** Room for a 22-character CUPS in the mono stack, padding included. */
const CUPS_COLUMN_WIDTH = "224px";
const OWNER_COLUMN_WIDTH = "30%";

/** The wide layout's columns. The CUPS is a column of its own, so it is shown even when it is the title. */
export function supplyTableColumns({ showOwner }: SupplyRowOptions): ListTableColumn<SupplyResponse>[] {
  return [
    {
      key: "code",
      header: "CUPS",
      width: CUPS_COLUMN_WIDTH,
      render: (supply) => (
        <Typography variant="body2" sx={{ fontFamily: fontFamilies.mono }}>
          {supply.code}
        </Typography>
      ),
    },
    ...(showOwner
      ? [
          {
            key: "owner",
            header: "Titular",
            width: OWNER_COLUMN_WIDTH,
            render: (supply: SupplyResponse) => <Typography variant="body2">{supplyOwnerText(supply)}</Typography>,
          },
        ]
      : []),
  ];
}
