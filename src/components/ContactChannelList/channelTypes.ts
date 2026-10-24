import type { ContactChannelResponseType } from "../../api/models";

/** How each channel type is named on screen (#296). */
export const CONTACT_CHANNEL_TYPE_LABELS: Record<ContactChannelResponseType, string> = {
  PHONE: "Teléfono",
  EMAIL: "Email",
  ADDRESS: "Dirección",
};

/** The id of a channel's heading, for a page that sends focus to it. */
export const contactChannelHeadingId = (index: number) => `contact-channel-${index}`;
/** The id of a channel's "Editar", for a page that sends focus to it. */
export const contactChannelEditId = (index: number) => `contact-channel-${index}-edit`;
