import type { ContactChannelResponseType } from "../../api/models";

/**
 * The link a contact channel's value opens, or `null` when it is not one.
 *
 * The only place a phone or email becomes a link (#295): every list of
 * channels, the operator contact included, goes through here. A phone keeps its
 * digits and a leading "+"; the spaces people write it with are dropped from
 * the href, never from what is shown.
 */
export function contactHref(type: ContactChannelResponseType, value: string): string | null {
  switch (type) {
    case "PHONE":
      return `tel:${value.replace(/\s+/g, "")}`;
    case "EMAIL":
      return `mailto:${value}`;
    case "ADDRESS":
      return null;
  }
}
