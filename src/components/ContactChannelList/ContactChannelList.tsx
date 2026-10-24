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
 * A community's contact channels, in the order given (#295), each as a
 * bordered card. A phone or an email is a link the user can tap; an address is
 * text. With `onEdit`, each channel also has an "Editar" action (#296);
 * without it, the list is read-only.
 */
export const ContactChannelList: FC<ContactChannelListProps> = ({ channels, onEdit, highlightIndex, editDisabled }) => (
  <Box component="ul" aria-label="Canales de contacto" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
    {channels.map((channel, index) => {
      const Icon = ICONS[channel.type];
      const href = contactHref(channel.type, channel.value);
      const typeLabel = CONTACT_CHANNEL_TYPE_LABELS[channel.type];
      const highlighted = !!onEdit && highlightIndex === index;
      return (
        <Box
          component="li"
          key={index}
          sx={{
            display: "flex",
            gap: { xs: 1.5, sm: 2 },
            alignItems: "flex-start",
            p: { xs: 1.5, sm: 2 },
            border: 1,
            borderColor: colors.border.light,
            borderRadius: radii.default,
            backgroundColor: highlighted ? colors.brand.surface : colors.background.paper,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // On the highlighted card the disc would vanish into the same tint.
              backgroundColor: highlighted ? colors.background.paper : colors.brand.surface,
            }}
          >
            <Icon fontSize="small" sx={{ color: "primary.main" }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Editar shares the row of the type and the name only, so the
                value, the schedule and the notes keep the card's full width. */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                {/* The type, unless the name already says it (the operator's
                    "Teléfono" and "Email"). With onEdit the heading's name carries
                    the type, so the caption is not read a second time. */}
                {channel.label.toLowerCase() !== typeLabel.toLowerCase() && (
                  <Typography variant="caption" component="p" aria-hidden={onEdit ? true : undefined} sx={{ color: colors.text.subtle }}>
                    {typeLabel}
                  </Typography>
                )}
                {onEdit ? (
                  <Typography
                    variant="subtitle2"
                    component="h3"
                    id={contactChannelHeadingId(index)}
                    tabIndex={-1}
                    aria-label={`${channel.label}, ${typeLabel.toLowerCase()}`}
                    sx={{ color: colors.text.primary, m: 0 }}
                  >
                    {channel.label}
                  </Typography>
                ) : (
                  <Typography variant="subtitle2" component="p" sx={{ color: colors.text.primary }}>
                    {channel.label}
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
                  sx={{ minHeight: 44, flexShrink: 0, mt: -0.5, mr: -1 }}
                >
                  Editar
                </Button>
              )}
            </Box>
            <Box sx={{ mt: 1 }}>
              {href ? (
                <Link href={href} underline="always" sx={{ overflowWrap: "anywhere" }}>
                  {channel.value}
                </Link>
              ) : (
                <Typography variant="body2" sx={{ color: colors.text.body, overflowWrap: "anywhere" }}>
                  {channel.value}
                </Typography>
              )}
            </Box>
            {channel.schedule && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                <AccessTimeIcon aria-hidden fontSize="small" sx={{ color: colors.text.subtle }} />
                <Typography variant="body2" sx={{ color: colors.text.subtle }}>
                  {channel.schedule}
                </Typography>
              </Box>
            )}
            {channel.notes && (
              <Typography variant="body2" sx={{ color: colors.text.body, mt: 0.5 }}>
                {channel.notes}
              </Typography>
            )}
          </Box>
        </Box>
      );
    })}
  </Box>
);
