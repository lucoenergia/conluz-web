import type { FC } from "react";
import { Box, TableCell, TableRow, Typography } from "@mui/material";
import { colors } from "../../theme/tokens";
import { formatPercentage } from "../../utils/formatPercentage";
import {
  getApplicationStateDetail,
  getApplicationStateLabel,
  getEndStateLabel,
  isEndStateReadOnly,
} from "../../pages/production/sharingAgreementCoefficientState";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

export interface SharingAgreementCoefficientRowProps {
  coefficient: SharingAgreementPartitionCoefficientResponse;
}

export const SharingAgreementCoefficientTableRow: FC<SharingAgreementCoefficientRowProps> = ({ coefficient }) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);

  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" fontWeight="600">
          {coefficient.supply?.name || "-"}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {coefficient.supply?.code || "-"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight="600">
          {formatPercentage(coefficient.coefficient ?? 0)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{getApplicationStateLabel(coefficient.applicationState)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {getApplicationStateDetail(coefficient)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={endStateReadOnly ? { color: colors.text.muted } : undefined}>
          {getEndStateLabel(coefficient)}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

export const SharingAgreementCoefficientCard: FC<SharingAgreementCoefficientRowProps> = ({ coefficient }) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        py: 1.5,
        borderBottom: `1px solid ${colors.divider}`,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
        <Typography variant="body2" fontWeight="600">
          {coefficient.supply?.name || "-"}
        </Typography>
        <Typography variant="body2" fontWeight="600">
          {formatPercentage(coefficient.coefficient ?? 0)}
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ color: colors.text.secondary }}>
        {coefficient.supply?.code || "-"}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mt: 0.5 }}>
        <Box>
          <Typography variant="body2">{getApplicationStateLabel(coefficient.applicationState)}</Typography>
          <Typography variant="caption" sx={{ color: colors.text.secondary, display: "block" }}>
            {getApplicationStateDetail(coefficient)}
          </Typography>
        </Box>
        <Typography variant="body2" sx={endStateReadOnly ? { color: colors.text.muted } : undefined}>
          {getEndStateLabel(coefficient)}
        </Typography>
      </Box>
    </Box>
  );
};
