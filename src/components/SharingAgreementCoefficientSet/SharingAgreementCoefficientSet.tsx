import { useMemo, useState, type FC } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import { colors, radii } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { EmptyState } from "../EmptyState";
import { SearchBar } from "../SearchBar/SearchBar";
import { AddSupplyDialog } from "../AddSupplyDialog";
import type { AddSupplyDialogProps } from "../AddSupplyDialog";
import { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "../SharingAgreementCoefficientRow";
import { useDebounce } from "../../utils/useDebounce";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { useActiveCommunity } from "../../context/community.context";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { SharingAgreementPartitionCoefficientResponseApplicationState, SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import {
  filterSharingAgreementCoefficients,
  type SharingAgreementCoefficientApplicationStateFilter,
} from "../../pages/production/sharingAgreementCoefficientFilters";
import { getApplicationStateLabel } from "../../pages/production/sharingAgreementCoefficientState";
import { normalizeForSearch } from "../../pages/production/sharingAgreementFilters";
import {
  buildEditableRowFromSupply,
  buildEditableRowsFromCoefficients,
  isValidCoefficientValue,
  retextRowsForUnit,
  updateRowInput,
  type CoefficientInputUnit,
  type EditableCoefficientRow,
} from "../../pages/production/sharingAgreementCoefficientEditing";
import {
  COEFFICIENT_SCALE,
  computeSharingAgreementCoefficientSums,
  formatCoefficientPercentage,
  isFullSum,
  type SharingAgreementCoefficientSums,
} from "../../pages/production/sharingAgreementCoefficientSums";
import { useSharingAgreementCoefficientMutations } from "../../pages/production/useSharingAgreementCoefficientMutations";

export interface SharingAgreementCoefficientSetProps {
  plantId: string;
  sharingAgreementId: string;
  coefficients: SharingAgreementPartitionCoefficientResponse[];
  installedPowerKw: number | undefined;
  agreementStatus: StatusValue | undefined;
}

// A deliberate 3-chip cut for this slice: applicationState only. The design
// mock-up shows a fourth "Cerrados" chip keyed on endState instead — left for
// a later issue, not an oversight.
const APPLICATION_STATE_FILTERS: SharingAgreementCoefficientApplicationStateFilter[] = [
  "all",
  SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
];

function filterEditableRows(rows: EditableCoefficientRow[], searchText: string): EditableCoefficientRow[] {
  const trimmed = searchText.trim();
  if (!trimmed) return rows;
  const normalizedQuery = normalizeForSearch(trimmed);
  return rows.filter((row) => {
    const name = row.coefficient.supply?.name ? normalizeForSearch(row.coefficient.supply.name) : "";
    const code = row.coefficient.supply?.code ? normalizeForSearch(row.coefficient.supply.code) : "";
    return name.includes(normalizedQuery) || code.includes(normalizedQuery);
  });
}

/**
 * The sum caption. Percentage mode is unchanged from before this feature. kW
 * mode always states the precise percentage gap alongside a 2-decimal kW
 * total — "kW rounds to installedPowerKw" is a coarse, disclosed statement,
 * never phrased as "done"/"cuadra": the coefficient sum stays the governing
 * indicator (rendered separately, always, by the caller).
 */
function formatSumCaption(
  sums: SharingAgreementCoefficientSums,
  inputUnit: CoefficientInputUnit,
  installedPowerKw: number | undefined,
): string {
  const full = isFullSum(sums.fileSumUnits);
  if (inputUnit !== "kw" || installedPowerKw === undefined) {
    return full ? "Suma completa (100%)" : "Sigue añadiendo o ajustando coeficientes hasta llegar al 100%";
  }

  const kwTotal = (sums.fileSumUnits / COEFFICIENT_SCALE) * installedPowerKw;
  const kwSummary = `${formatKilowatts(kwTotal)} de ${formatKilowatts(installedPowerKw)} instalados`;
  if (full) return `Suma completa (100%) · ${kwSummary}`;

  const kwRoundsToInstalled = Math.round(kwTotal * 100) === Math.round(installedPowerKw * 100);
  if (!kwRoundsToInstalled) return `${kwSummary} — sigue añadiendo o ajustando suministros hasta llegar al 100%`;

  const gapUnits = COEFFICIENT_SCALE - sums.fileSumUnits;
  const gapLabel = gapUnits > 0 ? "faltan" : "sobran";
  const gapPercent = formatCoefficientPercentage(Math.abs(gapUnits) / COEFFICIENT_SCALE);
  return `${kwSummary} (con redondeo a céntimos) — ${gapLabel} ${gapPercent} por ajustar en modo porcentaje.`;
}

export const SharingAgreementCoefficientSet: FC<SharingAgreementCoefficientSetProps> = ({
  plantId,
  sharingAgreementId,
  coefficients,
  installedPowerKw,
  agreementStatus,
}) => {
  const activeCommunityId = useActiveCommunity();
  const { replaceCoefficients, isReplacing } = useSharingAgreementCoefficientMutations(plantId);

  const [searchText, setSearchText] = useState("");
  const [applicationStateFilter, setApplicationStateFilter] = useState<SharingAgreementCoefficientApplicationStateFilter>("all");
  const debouncedSearchText = useDebounce(searchText, 500);

  const [isEditing, setIsEditing] = useState(false);
  const [inputUnit, setInputUnit] = useState<CoefficientInputUnit>("kw");
  const [rows, setRows] = useState<EditableCoefficientRow[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [sumWarning, setSumWarning] = useState<string | undefined>();

  useUnsavedChangesGuard(isEditing);

  const isDraft = agreementStatus === SharingAgreementResponseStatus.DRAFT;
  const kwModeAvailable = installedPowerKw !== undefined && installedPowerKw > 0;

  const filteredCoefficients = useMemo(
    () => filterSharingAgreementCoefficients(coefficients, debouncedSearchText, applicationStateFilter),
    [coefficients, debouncedSearchText, applicationStateFilter],
  );

  const filteredRows = useMemo(() => filterEditableRows(rows, debouncedSearchText), [rows, debouncedSearchText]);

  // Unit-independent: always reads the canonical `value`, never re-derives it
  // from text — the sum (and canSave, and the save payload below) can't be
  // fooled by whichever unit happens to be on screen.
  const sums = useMemo(
    () => computeSharingAgreementCoefficientSums(rows.map((row) => ({ coefficient: row.value }))),
    [rows],
  );

  const canSave = rows.length > 0 && rows.every((row) => isValidCoefficientValue(row.value));
  const alreadyAddedSupplyIds = useMemo(() => new Set(rows.map((row) => row.supplyId)), [rows]);

  const handleStartEditing = () => {
    const startingUnit: CoefficientInputUnit = kwModeAvailable ? "kw" : "percentage";
    setInputUnit(startingUnit);
    setRows(buildEditableRowsFromCoefficients(coefficients, startingUnit, installedPowerKw));
    setSumWarning(undefined);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setRows([]);
  };

  const handleUnitChange = (newUnit: CoefficientInputUnit) => {
    if (newUnit === inputUnit) return;
    setRows((prev) => retextRowsForUnit(prev, newUnit, installedPowerKw));
    setInputUnit(newUnit);
  };

  const handleCoefficientChange = (supplyId: string, value: string) => {
    setRows((prev) => updateRowInput(prev, supplyId, value, inputUnit, installedPowerKw));
  };

  const handleRemoveRow = (supplyId: string) => {
    setRows((prev) => prev.filter((row) => row.supplyId !== supplyId));
  };

  const handleConfirmAddSupplies: AddSupplyDialogProps["onConfirm"] = (supplies) => {
    setRows((prev) => [...prev, ...supplies.map(buildEditableRowFromSupply)]);
    setIsPickerOpen(false);
  };

  const handleSave = async () => {
    const outcome = await replaceCoefficients(sharingAgreementId, rows);
    if (outcome.success) {
      setIsEditing(false);
      setRows([]);
      setSumWarning(outcome.sumWarning);
    }
  };

  if (coefficients.length === 0 && !isEditing) {
    return (
      <>
        <EmptyState
          icon={HandshakeOutlinedIcon}
          title="Sin coeficientes de reparto"
          subtitle="Este acuerdo todavía no tiene coeficientes. Podrás adjuntar un fichero o editarlos manualmente."
          actionButton={
            isDraft
              ? { label: "Editar coeficientes", onClick: handleStartEditing, startIcon: <EditOutlinedIcon /> }
              : undefined
          }
        />
        {isDraft && (
          <AddSupplyDialog
            isOpen={isPickerOpen}
            communityId={activeCommunityId}
            alreadyAddedSupplyIds={alreadyAddedSupplyIds}
            onCancel={() => setIsPickerOpen(false)}
            onConfirm={handleConfirmAddSupplies}
          />
        )}
      </>
    );
  }

  return (
    <Paper elevation={0} sx={sxStyles.softPanel}>
      {sumWarning && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setSumWarning(undefined)}>
          Los coeficientes se han guardado, pero {sumWarning.charAt(0).toLowerCase() + sumWarning.slice(1)}
        </Alert>
      )}

      {/* Row 1: unit toggle (fixed shape, never affected by variable-length text) + search. */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          mb: isEditing ? 1.5 : 2,
        }}
      >
        {isEditing ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              px: 1.5,
              py: 0.75,
              borderRadius: radii.default,
              backgroundColor: colors.background.surface,
              border: `1px solid ${colors.border.light}`,
              width: "fit-content",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Editar coeficientes en:
            </Typography>
            <ToggleButtonGroup
              value={inputUnit}
              exclusive
              size="small"
              color="primary"
              onChange={(_, value: CoefficientInputUnit | null) => value && handleUnitChange(value)}
            >
              <ToggleButton value="percentage">%</ToggleButton>
              <Tooltip title={kwModeAvailable ? "" : "Este acuerdo no tiene potencia instalada definida"}>
                <span>
                  <ToggleButton value="kw" disabled={!kwModeAvailable}>
                    kW
                  </ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", flexWrap: "nowrap", pb: 0.5 }}>
            {APPLICATION_STATE_FILTERS.map((state) => (
              <Chip
                key={state}
                label={state === "all" ? "Todos" : getApplicationStateLabel(state)}
                onClick={() => setApplicationStateFilter(state)}
                color={applicationStateFilter === state ? (state === "all" ? "primary" : "default") : "default"}
                variant={applicationStateFilter === state ? "filled" : "outlined"}
                size="small"
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <SearchBar value={searchText} onChange={setSearchText} placeholder="Buscar por punto o CUPS" />
          {isDraft && !isEditing && (
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={handleStartEditing}>
              Editar coeficientes
            </Button>
          )}
        </Box>
      </Box>

      {/* Row 2: sum readout — its own row, free to grow to any length without moving the toggle. */}
      {isEditing && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Suma del fichero: {formatCoefficientPercentage(sums.fileSumUnits / COEFFICIENT_SCALE)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatSumCaption(sums, inputUnit, installedPowerKw)}
          </Typography>
        </Box>
      )}

      {isEditing && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Tooltip title={activeCommunityId ? "" : "Selecciona una comunidad activa para añadir suministros"}>
            <span>
              <Button
                variant="outlined"
                startIcon={<PersonAddAltOutlinedIcon />}
                onClick={() => setIsPickerOpen(true)}
                disabled={!activeCommunityId}
              >
                Añadir suministro
              </Button>
            </span>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={handleCancelEditing} disabled={isReplacing}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={!canSave || isReplacing}>
            {isReplacing ? "Guardando…" : "Guardar"}
          </Button>
        </Box>
      )}

      {isEditing && filteredRows.length === 0 && rows.length === 0 ? (
        <EmptyState
          icon={HandshakeOutlinedIcon}
          title="Sin coeficientes todavía"
          subtitle="Añade suministros para empezar a repartir la producción."
        />
      ) : (isEditing ? filteredRows : filteredCoefficients).length === 0 ? (
        <EmptyState
          icon={SearchOffIcon}
          title="No se encontraron coeficientes"
          subtitle="No hay coeficientes que coincidan con los filtros aplicados."
        />
      ) : (
        <>
          {/* Desktop table */}
          <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.background.surface }}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Punto
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      CUPS
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      {isEditing && inputUnit === "kw" ? "Potencia (kW)" : "Coeficiente"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      {isEditing && inputUnit === "kw" ? "% equivalente" : "Energía asignada"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Estado de aplicación
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      Estado de fin
                    </Typography>
                  </TableCell>
                  {isEditing && <TableCell />}
                </TableRow>
              </TableHead>
              <TableBody>
                {isEditing
                  ? filteredRows.map((row) => (
                      <SharingAgreementCoefficientTableRow
                        key={row.supplyId}
                        coefficient={row.coefficient}
                        installedPowerKw={installedPowerKw}
                        isEditing
                        inputUnit={inputUnit}
                        coefficientInput={row.inputText}
                        editedValue={row.value}
                        onCoefficientChange={(value) => handleCoefficientChange(row.supplyId, value)}
                        onRemove={() => handleRemoveRow(row.supplyId)}
                      />
                    ))
                  : filteredCoefficients.map((coefficient) => (
                      <SharingAgreementCoefficientTableRow
                        key={coefficient.coefficientId}
                        coefficient={coefficient}
                        installedPowerKw={installedPowerKw}
                      />
                    ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile stacked cards */}
          <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column" }}>
            {isEditing
              ? filteredRows.map((row) => (
                  <SharingAgreementCoefficientCard
                    key={row.supplyId}
                    coefficient={row.coefficient}
                    installedPowerKw={installedPowerKw}
                    isEditing
                    inputUnit={inputUnit}
                    coefficientInput={row.inputText}
                    editedValue={row.value}
                    onCoefficientChange={(value) => handleCoefficientChange(row.supplyId, value)}
                    onRemove={() => handleRemoveRow(row.supplyId)}
                  />
                ))
              : filteredCoefficients.map((coefficient) => (
                  <SharingAgreementCoefficientCard
                    key={coefficient.coefficientId}
                    coefficient={coefficient}
                    installedPowerKw={installedPowerKw}
                  />
                ))}
          </Box>
        </>
      )}

      {isDraft && (
        <AddSupplyDialog
          isOpen={isPickerOpen}
          communityId={activeCommunityId}
          alreadyAddedSupplyIds={alreadyAddedSupplyIds}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handleConfirmAddSupplies}
        />
      )}
    </Paper>
  );
};
