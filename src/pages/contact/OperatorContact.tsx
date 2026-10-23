import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { ContactChannelResponse, OperatorContactResponse } from "../../api/models";
import { ContactChannelList } from "../../components/ContactChannelList";
import { colors } from "../../theme/tokens";

/** The operator's phone and email as channels, so they get the same link rules. */
function operatorChannels(contact: OperatorContactResponse): ContactChannelResponse[] {
  const channels: ContactChannelResponse[] = [];
  if (contact.phone) {
    channels.push({ type: "PHONE", label: "Teléfono", value: contact.phone, schedule: null, notes: null });
  }
  channels.push({ type: "EMAIL", label: "Email", value: contact.email, schedule: null, notes: null });
  return channels;
}

/** The organisation operating this instance, as the last-resort contact (#295). */
export const OperatorContact: FC<{ contact: OperatorContactResponse }> = ({ contact }) => (
  <Box component="section" aria-labelledby="operator-contact-heading">
    <Typography id="operator-contact-heading" variant="h6" component="h2" sx={{ color: colors.text.primary }}>
      ¿No sabes quién gestiona tu comunidad?
    </Typography>
    <Typography variant="body2" sx={{ color: colors.text.body, mb: 2 }}>
      {contact.name}
    </Typography>
    <ContactChannelList channels={operatorChannels(contact)} />
    {contact.schedule && (
      <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 2 }}>
        {contact.schedule}
      </Typography>
    )}
    {contact.notes && (
      <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 1 }}>
        {contact.notes}
      </Typography>
    )}
  </Box>
);
