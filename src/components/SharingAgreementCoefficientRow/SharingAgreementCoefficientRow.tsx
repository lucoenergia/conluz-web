import type { FC, MouseEvent } from "react";
import { Box, Checkbox, IconButton, InputAdornment, TableCell, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { colors } from "../../theme/tokens";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { formatDecimalForInput } from "../../utils/parseDecimalInput";
import {
  MAX_PERCENTAGE_DECIMALS,
  isUnsavedCoefficientRow,
  isValidCoefficientValue,
  parsePercentageInput,
  type CoefficientInputUnit,
} from "../../pages/production/sharingAgreementCoefficientEditing";
import {
  computeCoefficientDelta,
  formatCoefficientDelta,
  formatCoefficientPercentage,
} from "../../pages/production/sharingAgreementCoefficientSums";
import {
  getApplicationStateDetail,
  getApplicationStateHeadline,
  getAvailableCoefficientActions,
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
  /**
   * Restores this row's coefficient to what it was when the editing session
   * opened. Passed ONLY for a row that currently differs from that value — the
   * container decides via `isRowRevertable`, so the control's presence is
   * itself the statement that the row was changed. Never passed for a row
   * added during the session: there is no initial value to go back to.
   */
  onRevert?: () => void;
  /** Whether the applicationState/endState cells render. Defaults to true; the container hides them for a clean DRAFT. */
  showStateColumns?: boolean;
  /**
   * Whether the "coefficient currently in force" column/line renders at all
   * (the desktop table needs a matching header cell). DRAFT-only: on a
   * published or superseded agreement the row's own value *is* the one in
   * force, so comparing it against itself says nothing.
   */
  showCurrentCoefficient?: boolean;
  /** Whether the batch-activation checkbox column/slot renders at all (the desktop table needs a matching header cell). */
  showSelectionColumn?: boolean;
  selected?: boolean;
  /** Present only when the row has at least one available action and selection is offered — its mere presence doesn't render a checkbox, `getAvailableCoefficientActions` still gates that. */
  onToggleSelected?: () => void;
  /** Whether the lifecycle-actions ⋯ column/slot renders at all — the container only mounts it when at least one visible row has an action. */
  showActionsColumn?: boolean;
  /**
   * Whether the menu carries "Ver histórico". Unlike the lifecycle actions it
   * is available on every saved row in every status, so it is what puts a ⋯
   * button on a DRAFT row, which previously had none.
   */
  showHistoryAction?: boolean;
  /** Opens the row-actions menu for this coefficient. The button itself only renders when `getAvailableCoefficientActions` returns something — never a disabled button. */
  onOpenActionsMenu?: (event: MouseEvent<HTMLElement>, coefficient: SharingAgreementPartitionCoefficientResponse) => void;
  /** True while any coefficient lifecycle mutation (any row's, or the batch bar's) is pending — freezes every row's menu button so a second action can't fire against data the in-flight one hasn't refreshed yet. */
  actionsDisabled?: boolean;
}

function formatAssignedEnergy(coefficientValue: number | undefined, installedPowerKw: number | undefined): string {
  if (coefficientValue === undefined || installedPowerKw === undefined) return "-";
  return formatKilowatts(coefficientValue * installedPowerKw);
}

function getCoefficientInputErrorMessage(
  raw: string,
  unit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): string {
  if (unit === "percentage") {
    // Six coefficient decimals are four in percent, and the surplus digits reach
    // the distributor. Say so rather than rounding them away in silence.
    const parsed = parsePercentageInput(raw);
    return !parsed.ok && parsed.reason === "TOO_MANY_DECIMALS"
      ? `Como máximo ${MAX_PERCENTAGE_DECIMALS} decimales`
      : "Introduce un valor entre 0 y 100 %";
  }
  if (installedPowerKw === undefined || installedPowerKw <= 0) return "Introduce un valor válido";
  return `Introduce un valor entre 0 y ${formatDecimalForInput(installedPowerKw)} kW`;
}

/**
 * What the current-coefficient column has to say about a row. Three cases,
 * not two — `null` from the server and `null` because nobody has asked yet
 * are different claims:
 *
 * - `unknown`: a row this session's picker synthesized. There is no server
 *   answer for it, so the column stays empty; rendering "—" would assert
 *   "nothing in force", which may well be false.
 * - `none`: a server row whose supply genuinely has no coefficient in force
 *   in this plant. "—" is the answer.
 * - `present`: the value, plus the difference the draft would make — `null`
 *   difference while the field is empty or unparseable mid-edit.
 */
type CurrentCoefficientView =
  | { kind: "unknown" }
  | { kind: "none" }
  | { kind: "present"; coefficient: number; delta: number | null };

function getCurrentCoefficientView(
  coefficient: SharingAgreementPartitionCoefficientResponse,
  draftValue: number | undefined,
): CurrentCoefficientView {
  if (isUnsavedCoefficientRow(coefficient)) return { kind: "unknown" };
  const current = coefficient.currentCoefficient;
  if (!current) return { kind: "none" };
  return {
    kind: "present",
    coefficient: current.coefficient,
    delta: computeCoefficientDelta(draftValue, current.coefficient),
  };
}

/** "Potencia asignada" in percentage mode; the equivalent percentage in kW mode — always the unit the admin isn't currently typing. */
function formatOtherUnit(value: number | undefined, unit: CoefficientInputUnit, installedPowerKw: number | undefined): string {
  if (value === undefined) return "-";
  if (unit === "kw") return formatCoefficientPercentage(value);
  if (installedPowerKw === undefined) return "-";
  return formatKilowatts(value * installedPowerKw);
}

/**
 * `supply.name` is nullable — the contract now says so too, since
 * SupplyReferenceResponse types it `string | null` — and it is empty for most
 * production rows. Falling back to "-" left the
 * CUPS — the only thing that actually identifies a supply point to the
 * distributor — demoted to a caption under a dash.
 *
 * When there is no name the CUPS becomes the primary identifier, and it is not
 * repeated underneath: one row, one identity.
 */
function getRowIdentity(supply: SharingAgreementPartitionCoefficientResponse["supply"]) {
  const name = supply?.name?.trim();
  const code = supply?.code?.trim();
  if (name) return { primary: name, secondary: code || "-" };
  return { primary: code || "-", secondary: null };
}

/**
 * The per-row way back from a lossy edit.
 *
 * Icon-only: the editing row already carries a "Quitar" icon button, and on a
 * 390px card list a labelled button would cost a line per row across a set
 * that routinely runs to 29 supplies. UndoOutlinedIcon is the glyph this app
 * already uses for reverting (the revert-to-draft confirmation). The tooltip
 * is for pointers only — the accessible name carries the meaning on its own,
 * and names the supply so it stays unambiguous among 29 identical-looking
 * buttons.
 */
function RevertCoefficientButton({ onRevert, supplyLabel }: { onRevert: () => void; supplyLabel: string }) {
  return (
    <Tooltip title="Restaurar valor inicial">
      <IconButton size="small" onClick={onRevert} aria-label={`Restaurar valor inicial de ${supplyLabel}`}>
        <UndoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

function CoefficientInput({
  coefficientInput,
  editedValue,
  unit,
  installedPowerKw,
  onCoefficientChange,
  align,
  supplyLabel,
}: {
  supplyLabel: string;
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
      aria-label={`Coeficiente de ${supplyLabel}`}
      value={coefficientInput}
      onChange={(event) => onCoefficientChange(event.target.value)}
      error={isInvalid || isEmpty}
      helperText={isInvalid ? getCoefficientInputErrorMessage(coefficientInput, unit, installedPowerKw) : isEmpty ? "Obligatorio" : undefined}
      placeholder={unit === "percentage" ? "0,0000" : "0,00"}
      slotProps={{
        htmlInput: { inputMode: "decimal", style: { textAlign: align === "end" ? "right" : "left" } },
        input: {
          endAdornment: unit === "kw" ? <InputAdornment position="end">kW</InputAdornment> : undefined,
        },
      }}
      // 160px is a comfortable width for a table cell and a greedy one on a
      // 390px card, where it was taken out of the supply's name.
      sx={{ width: { xs: 108, sm: 160 } }}
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
  onRevert,
  showStateColumns = true,
  showCurrentCoefficient = false,
  showSelectionColumn = false,
  selected,
  onToggleSelected,
  showActionsColumn = false,
  showHistoryAction = false,
  onOpenActionsMenu,
  actionsDisabled = false,
}) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);
  const otherUnitValue = isEditing ? formatOtherUnit(editedValue, inputUnit ?? "percentage", installedPowerKw) : undefined;
  const identity = getRowIdentity(coefficient.supply);
  const applicationStateDetail = getApplicationStateDetail(coefficient);
  const availableActions = getAvailableCoefficientActions(coefficient.applicationState, coefficient.endState);
  // "Ver histórico" alone is reason enough to offer the menu — on a DRAFT the
  // lifecycle actions are withheld by the container, so without this the
  // button would never appear there.
  const hasMenu = showHistoryAction || availableActions.length > 0;
  // While editing, the draft side of the comparison is what's in the field,
  // so the difference retracks as the admin types.
  const currentView = getCurrentCoefficientView(coefficient, isEditing ? editedValue : coefficient.coefficient);

  return (
    <TableRow>
      {showSelectionColumn && (
        <TableCell padding="checkbox">
          {onToggleSelected && availableActions.length > 0 && (
            <Checkbox
              checked={!!selected}
              onChange={onToggleSelected}
              inputProps={{ "aria-label": `Seleccionar ${coefficient.supply?.name || "suministro"}` }}
            />
          )}
        </TableCell>
      )}
      <TableCell>
        <Typography variant="body2" fontWeight="600" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {identity.primary}
        </Typography>
      </TableCell>
      <TableCell>
        {identity.secondary !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {identity.secondary}
          </Typography>
        )}
      </TableCell>
      {showCurrentCoefficient && (
        <TableCell align="right">
          {currentView.kind === "none" && (
            <Typography variant="body2" sx={{ color: colors.text.muted }}>
              —
            </Typography>
          )}
          {currentView.kind === "present" && (
            <>
              <Typography variant="body2">{formatCoefficientPercentage(currentView.coefficient)}</Typography>
              {currentView.delta !== null && (
                <Typography variant="caption" sx={{ color: colors.text.secondary, display: "block" }}>
                  {formatCoefficientDelta(currentView.delta)}
                </Typography>
              )}
            </>
          )}
        </TableCell>
      )}
      <TableCell align="right">
        {isEditing && inputUnit && onCoefficientChange ? (
          <CoefficientInput
            coefficientInput={coefficientInput ?? ""}
            editedValue={editedValue}
            unit={inputUnit}
            installedPowerKw={installedPowerKw}
            onCoefficientChange={onCoefficientChange}
            align="end"
            supplyLabel={coefficient.supply?.name || coefficient.supply?.code || "suministro"}
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
      {showStateColumns && (
        <TableCell>
          <Typography variant="body2">{getApplicationStateHeadline(coefficient)}</Typography>
          {applicationStateDetail && (
            <Typography variant="caption" color="text.secondary">
              {applicationStateDetail}
            </Typography>
          )}
        </TableCell>
      )}
      {showStateColumns && (
        <TableCell>
          <Typography variant="body2" sx={endStateReadOnly ? { color: colors.text.muted } : undefined}>
            {getEndStateLabel(coefficient)}
          </Typography>
        </TableCell>
      )}
      {isEditing && (
        <TableCell align="right">
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            {onRevert && (
              <RevertCoefficientButton
                onRevert={onRevert}
                supplyLabel={coefficient.supply?.name || coefficient.supply?.code || "suministro"}
              />
            )}
            {onRemove && (
              <IconButton size="small" onClick={onRemove} aria-label={`Quitar ${coefficient.supply?.name || "suministro"}`}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </TableCell>
      )}
      {showActionsColumn && (
        <TableCell padding="checkbox">
          {hasMenu && onOpenActionsMenu && (
            <IconButton
              size="small"
              disabled={actionsDisabled}
              onClick={(event) => onOpenActionsMenu(event, coefficient)}
              aria-label={`Más acciones para ${coefficient.supply?.name || coefficient.supply?.code || "suministro"}`}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </TableCell>
      )}
    </TableRow>
  );
};

/**
 * Footprint of a `size="small"` Checkbox (20px icon + 9px padding either side).
 * Held as a minimum rather than a fixed width so the empty slot tracks the real
 * control if MUI's metrics ever change.
 */
const SELECTION_SLOT_WIDTH = 38;

export const SharingAgreementCoefficientCard: FC<SharingAgreementCoefficientRowProps> = ({
  coefficient,
  installedPowerKw,
  isEditing,
  inputUnit,
  coefficientInput,
  editedValue,
  onCoefficientChange,
  onRemove,
  onRevert,
  showStateColumns = true,
  showCurrentCoefficient = false,
  showSelectionColumn = false,
  selected,
  onToggleSelected,
  showActionsColumn = false,
  showHistoryAction = false,
  onOpenActionsMenu,
  actionsDisabled = false,
}) => {
  const endStateReadOnly = isEndStateReadOnly(coefficient.endState);
  const otherUnitValue = isEditing ? formatOtherUnit(editedValue, inputUnit ?? "percentage", installedPowerKw) : undefined;
  const identity = getRowIdentity(coefficient.supply);
  const applicationStateDetail = getApplicationStateDetail(coefficient);
  const availableActions = getAvailableCoefficientActions(coefficient.applicationState, coefficient.endState);
  // "Ver histórico" alone is reason enough to offer the menu — on a DRAFT the
  // lifecycle actions are withheld by the container, so without this the
  // button would never appear there.
  const hasMenu = showHistoryAction || availableActions.length > 0;
  const showCheckbox = showSelectionColumn && !!onToggleSelected && availableActions.length > 0;
  const currentView = getCurrentCoefficientView(coefficient, isEditing ? editedValue : coefficient.coefficient);

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0 }}>
          {showSelectionColumn && (
            <Box
              sx={{
                minWidth: SELECTION_SLOT_WIDTH,
                display: "flex",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {showCheckbox && (
                <Checkbox
                  checked={!!selected}
                  onChange={onToggleSelected}
                  size="small"
                  inputProps={{ "aria-label": `Seleccionar ${coefficient.supply?.name || "suministro"}` }}
                />
              )}
            </Box>
          )}
          {/* Wraps rather than truncates: a CUPS identifies the supply, and an
              elided one identifies nothing. */}
          <Typography
            variant="body2"
            fontWeight="600"
            sx={{ fontVariantNumeric: "tabular-nums", minWidth: 0, wordBreak: "break-word" }}
          >
            {identity.primary}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          {isEditing && inputUnit && onCoefficientChange ? (
            <CoefficientInput
              coefficientInput={coefficientInput ?? ""}
              editedValue={editedValue}
              unit={inputUnit}
              installedPowerKw={installedPowerKw}
              onCoefficientChange={onCoefficientChange}
              align="start"
              supplyLabel={coefficient.supply?.name || coefficient.supply?.code || "suministro"}
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
          {isEditing && onRevert && (
            <RevertCoefficientButton
              onRevert={onRevert}
              supplyLabel={coefficient.supply?.name || coefficient.supply?.code || "suministro"}
            />
          )}
          {isEditing && onRemove && (
            <IconButton size="small" onClick={onRemove} aria-label={`Quitar ${coefficient.supply?.name || "suministro"}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
          {!isEditing && showActionsColumn && hasMenu && onOpenActionsMenu && (
            <IconButton
              size="small"
              disabled={actionsDisabled}
              onClick={(event) => onOpenActionsMenu(event, coefficient)}
              aria-label={`Más acciones para ${coefficient.supply?.name || coefficient.supply?.code || "suministro"}`}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {identity.secondary !== null && (
        <Typography variant="caption" sx={{ color: colors.text.secondary, fontVariantNumeric: "tabular-nums" }}>
          {identity.secondary}
        </Typography>
      )}

      {/* The card has no column headers, so the line names itself. Not mounted
          at all for an unsaved row — a blank line would just add height. */}
      {showCurrentCoefficient && currentView.kind !== "unknown" && (
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          {currentView.kind === "none"
            ? "Actual —"
            : `Actual ${formatCoefficientPercentage(currentView.coefficient)}${
                currentView.delta !== null ? ` · ${formatCoefficientDelta(currentView.delta)}` : ""
              }`}
        </Typography>
      )}

      {isEditing && (
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          {otherUnitValue}
        </Typography>
      )}

      {!isEditing && showStateColumns && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mt: 0.5 }}>
          <Box>
            <Typography variant="body2">{getApplicationStateHeadline(coefficient)}</Typography>
            {applicationStateDetail && (
              <Typography variant="caption" sx={{ color: colors.text.secondary, display: "block" }}>
                {applicationStateDetail}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" sx={endStateReadOnly ? { color: colors.text.muted } : undefined}>
            {getEndStateLabel(coefficient)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
