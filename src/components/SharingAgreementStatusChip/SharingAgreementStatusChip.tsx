import type { FC } from "react";
import { Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryIcon from "@mui/icons-material/History";
import { alphas, colors } from "../../theme/tokens";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import { getSharingAgreementStatusLabel } from "../../pages/production/sharingAgreementStatus";

export interface SharingAgreementStatusChipProps {
  status: StatusValue | undefined;
  /**
   * "onLight" (default) is tuned for a white card background (SharingAgreementCard).
   * "onDark" forces a near-opaque white pill instead of the tinted backgrounds below —
   * those tint colors are the same hue as the theme's primary.main banner background
   * (SharingAgreementDetailHeader), so on a solid primary-colored banner the PUBLISHED
   * variant in particular renders with zero contrast (blue text on a blue-tinted chip
   * on a solid blue banner). Icon/text colors are unchanged in both tones.
   */
  tone?: "onLight" | "onDark";
}

export const SharingAgreementStatusChip: FC<SharingAgreementStatusChipProps> = ({ status, tone = "onLight" }) => {
  const theme = useTheme();
  const label = getSharingAgreementStatusLabel(status);
  const onDark = tone === "onDark";

  switch (status) {
    case SharingAgreementResponseStatus.PUBLISHED:
      return (
        <Chip
          icon={<LockOutlinedIcon />}
          label={label}
          size="small"
          sx={{
            bgcolor: onDark ? alphas.white.strong : alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
            fontWeight: 600,
            "& .MuiChip-icon": { color: "primary.main" },
          }}
        />
      );
    case SharingAgreementResponseStatus.DRAFT:
      return (
        <Chip
          icon={<EditOutlinedIcon />}
          label={label}
          size="small"
          sx={{
            bgcolor: onDark ? alphas.white.strong : alphas.warning.light,
            color: "warning.main",
            fontWeight: 600,
            "& .MuiChip-icon": { color: "warning.main" },
          }}
        />
      );
    case SharingAgreementResponseStatus.SUPERSEDED:
      return (
        <Chip
          icon={<HistoryIcon />}
          label={label}
          size="small"
          sx={{
            bgcolor: onDark ? alphas.white.strong : colors.border.light,
            color: colors.text.secondary,
            fontWeight: 600,
            "& .MuiChip-icon": { color: colors.text.secondary },
          }}
        />
      );
    default:
      // Outlined neutral — mirrors CommunityStatusChip's "Deshabilitada" variant.
      return (
        <Chip
          label={label}
          size="small"
          variant={onDark ? "filled" : "outlined"}
          sx={{
            bgcolor: onDark ? alphas.white.strong : undefined,
            borderColor: colors.border.light,
            color: colors.text.secondary,
            fontWeight: 600,
          }}
        />
      );
  }
};
