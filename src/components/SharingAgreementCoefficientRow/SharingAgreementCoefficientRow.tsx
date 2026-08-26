import type { FC } from "react";
import { Box, IconButton, InputAdornment, TableCell, TableRow, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { colors } from "../../theme/tokens";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { formatDecimalForInput } from "../../utils/parseDecimalInput";
import { isValidCoefficientValue, type CoefficientInputUnit } from "../../pages/production/sharingAgreementCoefficientEditing";
import { formatCoefficientPercentage } from "../../pages/production/sharingAgreementCoefficientSums";
import {
  getApplicationStateDetail,
  getApplicationStateLabel,
  getEndStateLabel,
  isEndStateReadOnly,
} from "../../pages/production/sharingAgreementCoefficientState";
import type { SharingAgreementPartitionCoefficientResponse } from "../../api/models";

export interface SharingAgreementCoefficientRowProps {
  coefficient: SharingAgreementPartitionCoefficientResponse;
  installedPowerKw: number | undefined;
  /** When set, the coefficient cell becomes an editable input with a remove action. */
  isEditing?: boolean;
  /** Unit the editable input is currently expressed in. Required when `isEditing`. */
  inputUnit?: CoefficientInputUnit;
  coefficientInput?: string;
  /** The row's resolved canonical value — already parsed by the container, never re-derived here. */
  editedValue?: number;
  onCoefficientChange?: (value: string) => void;
  onRemove?: () => void;
}

function formatAssignedEnergy(coefficientValue: number | undefined, installedPowerKw: number | undefined): string {
  if (coefficientValue === undefined || installedPowerKw === undefined) return "-";
  return formatKilowatts(coefficientValue * installedPowerKw);
}

function getCoefficientInputErrorMessage(unit: CoefficientInputUnit, installedPowerKw: number | undefined): string {
  if (unit === "percentage") return "Introduce un valor entre 0 y 1";
  if (installedPowerKw === undefined || installedPowerKw <= 0) return "Introduce un valor válido";
  return `Introduce un valor entre 0 y ${formatDecimalForInput(installedPowerKw)} kW`;
}

/** "Energía asignada" in % mode (as always); the equivalent percentage in kW mode — always the unit the admin isn't currently typing. */
function formatOtherUnit(value: number | undefined, unit: CoefficientInputUnit, installedPowerKw: number | undefined): string {
  if (value === undefined) return "-";
  if (unit === "kw") return formatCoefficientPercentage(value);
  if (installedPowerKw === undefined) return "-";
  return formatKilowatts(value * installedPowerKw);
}

function CoefficientInput({
  coefficientInput,
  editedValue,
  unit,
  installedPowerKw,
  onCoefficientChange,
  align,
}: {
  coefficientInput: string;
  editedValue: number | undefined;
  unit: CoefficientInputUnit;
  installedPowerKw: number | undefined;
  onCoefficientChange: (value: string) => void;
  align: "start" | "end";
}) {
  const isEmpty = coefficientInput.trim() === "";
  const isInvalid = !isEmpty && !isValidCoefficientValue(editedValue);
  return (
    <TextField
      size="small"
      value={coefficientInput}
      onChange={(event) => onCoefficientChange(event.target.value)}
      error={isInvalid || isEmpty}
      helperText={isInvalid ? getCoefficientInputErrorMessage(unit, installedPowerKw) : isEmpty ? "Obligatorio" : undefined}
      placeholder={unit === "percentage" ? "0,000000" : "0,00"}
      slotProps={{
        htmlInput: { inputMode: "decimal", style: { textAlign: align === "end" ? "right" : "left" } },
        input: { endAdornment: <InputAdornment position="end">{unit === "percentage" ? "%" : "kW"}</InputAdornment> },
      }}
      sx={{ width: 160 }}
    />
  );
}

export const SharingAgreementCoefficientTableRow: FC<SharingAgreementCoefficientRowProps> = ({
  coefficient,
  installedPowerKw,
  isEditing,
  inputUnit,
  coefficientInput,
  editedValue,
  onCoefficientChange,
  onRemove,
}) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);
  const otherUnitValue = isEditing ? formatOtherUnit(editedValue, inputUnit ?? "percentage", installedPowerKw) : undefined;

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
        {isEditing && inputUnit && onCoefficientChange ? (
          <CoefficientInput
            coefficientInput={coefficientInput ?? ""}
            editedValue={editedValue}
            unit={inputUnit}
            installedPowerKw={installedPowerKw}
            onCoefficientChange={onCoefficientChange}
            align="end"
          />
        ) : (
          <Typography variant="body2" fontWeight="600">
            {formatCoefficientPercentage(coefficient.coefficient ?? 0)}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight="600">
          {isEditing ? otherUnitValue : formatAssignedEnergy(coefficient.coefficient, installedPowerKw)}
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
      {isEditing && (
        <TableCell align="right">
          {onRemove && (
            <IconButton size="small" onClick={onRemove} aria-label={`Quitar ${coefficient.supply?.name || "suministro"}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </TableCell>
      )}
    </TableRow>
  );
};

export const SharingAgreementCoefficientCard: FC<SharingAgreementCoefficientRowProps> = ({
  coefficient,
  installedPowerKw,
  isEditing,
  inputUnit,
  coefficientInput,
  editedValue,
  onCoefficientChange,
  onRemove,
}) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);
  const otherUnitValue = isEditing ? formatOtherUnit(editedValue, inputUnit ?? "percentage", installedPowerKw) : undefined;

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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Typography variant="body2" fontWeight="600">
          {coefficient.supply?.name || "-"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {isEditing && inputUnit && onCoefficientChange ? (
            <CoefficientInput
              coefficientInput={coefficientInput ?? ""}
              editedValue={editedValue}
              unit={inputUnit}
              installedPowerKw={installedPowerKw}
              onCoefficientChange={onCoefficientChange}
              align="start"
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Typography variant="body2" fontWeight="600">
                {formatCoefficientPercentage(coefficient.coefficient ?? 0)}
              </Typography>
              <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                {formatAssignedEnergy(coefficient.coefficient, installedPowerKw)}
              </Typography>
            </Box>
          )}
          {isEditing && onRemove && (
            <IconButton size="small" onClick={onRemove} aria-label={`Quitar ${coefficient.supply?.name || "suministro"}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: colors.text.secondary }}>
        {coefficient.supply?.code || "-"}
      </Typography>

      {isEditing && (
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          {otherUnitValue}
        </Typography>
      )}

      {!isEditing && (
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
      )}
    </Box>
  );
};
