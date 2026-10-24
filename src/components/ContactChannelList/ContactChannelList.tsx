import type { FC } from "react";
import { Box, Button, Link, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import type { ContactChannelResponse, ContactChannelResponseType } from "../../api/models";
import { colors, radii } from "../../theme/tokens";
import { CONTACT_CHANNEL_TYPE_LABELS, contactChannelEditId, contactChannelHeadingId } from "./channelTypes";
import { contactHref } from "./contactLink";

export interface ContactChannelListProps {
  /** The channels, in the order they are shown. */
  channels: ContactChannelResponse[];
  /**
   * Offers an "Editar" action per channel, for whoever may manage them (#296).
   * Each channel's name then becomes a focusable heading, so focus can be sent
   * to it after a save. Not passed for members.
   */
  onEdit?: (index: number) => void;
  /** Highlights the channel just saved. Only used together with `onEdit`. */
  highlightIndex?: number;
  /** Disables every "Editar" while a save is in flight. */
  editDisabled?: boolean;
}

const ICONS: Record<ContactChannelResponseType, SvgIconComponent> = {
  PHONE: LocalPhoneIcon,
  EMAIL: EmailIcon,
  ADDRESS: PlaceIcon,
};

/**
 * A community's contact channels, in the order given (#295). A phone or an
 * email is a link the user can tap; an address is text. With `onEdit`, each
 * channel also has an "Editar" action (#296); without it, the list is
 * read-only.
 */
export const ContactChannelList: FC<ContactChannelListProps> = ({ channels, onEdit, highlightIndex, editDisabled }) => (
  <Box component="ul" aria-label="Canales de contacto" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
    {channels.map((channel, index) => {
      const Icon = ICONS[channel.type];
      const href = contactHref(channel.type, channel.value);
      return (
        <Box
          component="li"
          key={index}
          sx={[
            { display: "flex", gap: 2, alignItems: "flex-start" },
            !!onEdit && { p: 1.5, mx: -1.5, borderRadius: radii.default },
            !!onEdit && highlightIndex === index && { backgroundColor: colors.brand.surface },
          ]}
        >
          <Icon aria-hidden sx={{ color: "primary.main", mt: 0.25 }} />
          <Box sx={{ minWidth: 0, flex: onEdit ? 1 : undefined }}>
            {onEdit ? (
              <Typography
                variant="subtitle2"
                component="h3"
                id={contactChannelHeadingId(index)}
                tabIndex={-1}
                aria-label={`${channel.label}, ${CONTACT_CHANNEL_TYPE_LABELS[channel.type].toLowerCase()}`}
                sx={{ color: colors.text.primary, m: 0 }}
              >
                {channel.label}
              </Typography>
            ) : (
              <Typography variant="subtitle2" component="p" sx={{ color: colors.text.primary }}>
                {channel.label}
              </Typography>
            )}
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
          {onEdit && (
            <Button
              variant="text"
              startIcon={<EditOutlinedIcon />}
              id={contactChannelEditId(index)}
              aria-label={`Editar ${channel.label}`}
              disabled={editDisabled}
              onClick={() => onEdit(index)}
              sx={{ minHeight: 44, flexShrink: 0, mt: -1 }}
            >
              Editar
            </Button>
          )}
        </Box>
      );
    })}
  </Box>
);
