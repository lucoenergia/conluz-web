import type { FC } from "react";
import { Chip } from "@mui/material";
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
   * "onLight" (default) is tuned for a white background (a list row, the
   * coefficient history): a neutral or brand tint carrying its `text` tone at >= 4.5:1.
   * "onDark" forces a near-opaque white pill instead, because the tints share the
   * hue of the primary banner behind them (SharingAgreementDetailHeader) and would
   * otherwise sit invisibly on it. Both tones use the same `text` tone, which clears
   * 4.5:1 on the white pill as well.
   */
  tone?: "onLight" | "onDark";
}

export const SharingAgreementStatusChip: FC<SharingAgreementStatusChipProps> = ({ status, tone = "onLight" }) => {
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
            bgcolor: onDark ? alphas.white.strong : colors.brand.surface,
            color: colors.brand.main,
            fontWeight: 600,
            "& .MuiChip-icon": { color: colors.brand.main },
          }}
        />
      );
    case SharingAgreementResponseStatus.DRAFT:
      // A dashed outline, not a colour: a draft is a stage of the lifecycle, not
      // a failure, and colour is kept for failures (UI-AGR-016).
      return (
        <Chip
          icon={<EditOutlinedIcon />}
          label={label}
          size="small"
          variant="outlined"
          sx={{
            bgcolor: onDark ? alphas.white.strong : "transparent",
            borderStyle: "dashed",
            borderColor: colors.text.secondary,
            color: colors.text.secondary,
            fontWeight: 600,
            "& .MuiChip-icon": { color: colors.text.secondary },
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
            bgcolor: onDark ? alphas.white.strong : colors.background.surface,
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
