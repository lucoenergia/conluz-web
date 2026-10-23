import type { FC } from "react";
import { Box, Link, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import type { ContactChannelResponse, ContactChannelResponseType } from "../../api/models";
import { colors } from "../../theme/tokens";
import { contactHref } from "./contactLink";

export interface ContactChannelListProps {
  /** The channels, in the order they are shown. */
  channels: ContactChannelResponse[];
}

const ICONS: Record<ContactChannelResponseType, SvgIconComponent> = {
  PHONE: LocalPhoneIcon,
  EMAIL: EmailIcon,
  ADDRESS: PlaceIcon,
};

/**
 * A community's contact channels, read-only, in the order given (#295). A phone
 * or an email is a link the user can tap; an address is text.
 */
export const ContactChannelList: FC<ContactChannelListProps> = ({ channels }) => (
  <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
    {channels.map((channel, index) => {
      const Icon = ICONS[channel.type];
      const href = contactHref(channel.type, channel.value);
      return (
        <Box component="li" key={index} sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Icon aria-hidden sx={{ color: "primary.main", mt: 0.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" component="p" sx={{ color: colors.text.primary }}>
              {channel.label}
            </Typography>
            {href ? (
              <Link href={href} underline="hover" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                {channel.value}
              </Link>
            ) : (
              <Typography variant="body2" sx={{ color: colors.text.body, overflowWrap: "anywhere" }}>
                {channel.value}
              </Typography>
            )}
            {channel.schedule && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <AccessTimeIcon aria-hidden fontSize="small" sx={{ color: colors.text.subtle }} />
                <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                  {channel.schedule}
                </Typography>
              </Box>
            )}
            {channel.notes && (
              <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 0.5 }}>
                {channel.notes}
              </Typography>
            )}
          </Box>
        </Box>
      );
    })}
  </Box>
);
