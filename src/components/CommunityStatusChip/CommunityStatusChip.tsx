import type { FC } from "react";
import { Chip } from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { colors } from "../../theme/tokens";

/**
 * Status vocabulary shown for a community. Owned here (alongside its visual
 * mapping) and consumed by the platform overview derivation.
 */
export type CommunityStatus = "Activa" | "Sin admin" | "Sin usuarios" | "Deshabilitada";

export interface CommunityStatusChipProps {
  status: CommunityStatus;
}

export const CommunityStatusChip: FC<CommunityStatusChipProps> = ({ status }) => {
  switch (status) {
    case "Activa":
      return <Chip label="Activa" color="success" size="small" sx={{ fontWeight: 600 }} />;
    case "Sin admin":
      return (
        <Chip
          label="Sin admin"
          color="warning"
          size="small"
          icon={<WarningAmberRoundedIcon />}
          sx={{ fontWeight: 600 }}
        />
      );
    case "Sin usuarios":
      // Filled neutral.
      return (
        <Chip
          label="Sin usuarios"
          size="small"
          sx={{ bgcolor: colors.border.light, color: colors.text.secondary, fontWeight: 600 }}
        />
      );
    case "Deshabilitada":
      // Outlined neutral — visually distinct from the filled "Sin usuarios".
      return (
        <Chip
          label="Deshabilitada"
          size="small"
          variant="outlined"
          sx={{ borderColor: colors.border.light, color: colors.text.secondary, fontWeight: 600 }}
        />
      );
  }
};
