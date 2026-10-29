import type { FC } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";
import type { MembershipState } from "../members/membershipStatus";
import { invitationText } from "./platformAdminStatus";

/** A pending platform-admin invitation's state: always pending, since it holds no role yet (#288). */
export const PlatformInvitationChip: FC = () => (
  <Chip label="Pendiente" color="warning" size="small" sx={{ fontWeight: 600 }} />
);

/** The state chip with the link's caption under it, as a table cell shows them. */
export const PlatformInvitationCell: FC<{ invitation: MembershipState }> = ({ invitation }) => {
  const caption = invitationText(invitation);
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
      <PlatformInvitationChip />
      {caption && (
        <Typography variant="caption" sx={{ color: colors.text.subtle }}>
          {caption}
        </Typography>
      )}
    </Stack>
  );
};
