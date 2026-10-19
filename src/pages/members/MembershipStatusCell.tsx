import type { FC } from "react";
import { Chip, Stack, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";
import { invitationText, statusOf, type MembershipState, type MembershipStatus } from "./membershipStatus";

const STATUS_CHIPS: Record<MembershipStatus, { label: string; color: "success" | "warning" | "error" }> = {
  active: { label: "Activo", color: "success" },
  pending: { label: "Pendiente", color: "warning" },
  suspended: { label: "Suspendido", color: "error" },
};

/** The membership's state as a chip: the roster's and the community admins' (#275, #276). */
export const MembershipStatusChip: FC<{ membership: MembershipState }> = ({ membership }) => {
  const { label, color } = STATUS_CHIPS[statusOf(membership)];
  return <Chip label={label} color={color} size="small" sx={{ fontWeight: 600 }} />;
};

/** The state chip with the invitation's caption under it, as a table cell shows them. */
export const MembershipStatusCell: FC<{ membership: MembershipState }> = ({ membership }) => {
  const invitation = invitationText(membership);
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
      <MembershipStatusChip membership={membership} />
      {invitation && (
        <Typography variant="caption" sx={{ color: colors.text.subtle }}>
          {invitation}
        </Typography>
      )}
    </Stack>
  );
};
