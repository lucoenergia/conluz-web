import type { FC } from "react";
import { Chip } from "@mui/material";
import { colors } from "../../theme/tokens";
import { membershipStatusOf, statusLabelOf, type MembershipStatus, type MembershipStatusFields } from "./membershipStatus";

/**
 * No alert colour: none of these is an error. Every pending sub-status shares
 * one family, apart from Activo, and Suspendido is neutral (#331).
 */
const STATUS_TONES: Record<MembershipStatus, { bgcolor: string; color: string; borderColor: string }> = {
  active: { bgcolor: colors.success.surface, color: colors.success.main, borderColor: colors.success.surface },
  pending: { bgcolor: colors.info.surface, color: colors.info.main, borderColor: colors.info.surface },
  suspended: { bgcolor: colors.background.surface, color: colors.secondary.main, borderColor: colors.border.light },
};

/** The membership's derived status as a chip: the roster's and the community admins' (#275, #276, #331). */
export const MembershipStatusChip: FC<{ membership: MembershipStatusFields }> = ({ membership }) => {
  const derived = membershipStatusOf(membership);
  return (
    <Chip
      label={statusLabelOf(derived)}
      size="small"
      sx={{ ...STATUS_TONES[derived.status], border: "1px solid", fontWeight: 600, flexShrink: 0 }}
    />
  );
};
