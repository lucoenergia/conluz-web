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
}

export const SharingAgreementStatusChip: FC<SharingAgreementStatusChipProps> = ({ status }) => {
  const theme = useTheme();
  const label = getSharingAgreementStatusLabel(status);

  switch (status) {
    case SharingAgreementResponseStatus.PUBLISHED:
      return (
        <Chip
          icon={<LockOutlinedIcon />}
          label={label}
          size="small"
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.12),
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
            bgcolor: alphas.warning.light,
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
            bgcolor: colors.border.light,
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
          variant="outlined"
          sx={{ borderColor: colors.border.light, color: colors.text.secondary, fontWeight: 600 }}
        />
      );
  }
};
