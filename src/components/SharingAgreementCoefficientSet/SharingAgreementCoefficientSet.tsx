import { useEffect, useMemo, useRef, useState, type FC, type MouseEvent, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
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
import { alpha, useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { colors, fontSizes, radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { EmptyState } from "../EmptyState";
import { SearchBar } from "../SearchBar/SearchBar";
import { SharingAgreementCoefficientSumCards } from "../SharingAgreementCoefficientSumCards";
import { AddSupplyDialog } from "../AddSupplyDialog";
import type { AddSupplyDialogProps } from "../AddSupplyDialog";
import { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "../SharingAgreementCoefficientRow";
import { ApplyCoefficientDateConfirmationModal } from "../Modals/ApplyCoefficientDateConfirmationModal";
import { CorrectCoefficientDateConfirmationModal } from "../Modals/CorrectCoefficientDateConfirmationModal";
import { DeactivateOrReopenCoefficientConfirmationModal } from "../Modals/DeactivateOrReopenCoefficientConfirmationModal";
import { CloseCoefficientConfirmationModal } from "../Modals/CloseCoefficientConfirmationModal";
import { useDebounce } from "../../utils/useDebounce";
import { formatKilowatts } from "../../utils/formatKilowatts";
import { useActiveCommunity } from "../../context/community.context";
import { useSuccessDispatch } from "../../context/success.context";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  SharingAgreementResponseStatus,
} from "../../api/models";
import type { SharingAgreementPartitionCoefficientResponse, SharingAgreementResponseStatus as StatusValue } from "../../api/models";
import {
  filterSharingAgreementCoefficients,
  type SharingAgreementCoefficientApplicationStateFilter,
} from "../../pages/production/sharingAgreementCoefficientFilters";
import {
  getApplicationStateColor,
  getApplicationStateLabel,
  getAvailableCoefficientActions,
  isPendingActivation,
  type CoefficientAction,
} from "../../pages/production/sharingAgreementCoefficientState";
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
import { getCoefficientDateDisabledReason } from "../../pages/production/coefficientDateValidation";

// Authoritative rather than measured: these constants *set* the fixed bar's
// height (and the matching spacer's height) at each breakpoint, rather than
// describing whatever the content happens to render at. The disabled-reason
// line reserves its own space (minHeight) so the bar's real content never
// exceeds these regardless of which state is showing.
// Mobile: confirmed against the Playwright capture at the narrowest
// supported viewport (390px, mobile project) — see tests/visual for the
// assertion that nothing clips inside it.
const BATCH_BAR_HEIGHT_MOBILE = 208;
// Desktop: measured (not guessed from the mobile value) against a real
// Chromium render of the bar's tallest content state — both count-text
// lines, the date field with its permanent helper text, and the reserved
// reason line populated — at the 1440px desktop viewport: 137.8px measured,
// rounded up with headroom on the same generous basis as the mobile
// constant. Confirmed against the Playwright capture that nothing clips.
const BATCH_BAR_HEIGHT_DESKTOP = 160;

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

// getAvailableCoefficientActions returns a single-item ["apply"] for a
// PENDING row (no divider — there's only ever one item), or, once APPLIED,
// [correct, deactivate, (close|reopen)] — "correct" is the only plain edit
// among those, everything after it rewrites history retroactively, hence
// the divider always sitting right after index 0 in that case.
const ROW_ACTION_LABEL: Record<CoefficientAction, string> = {
  apply: "Registrar fecha",
  correct: "Corregir fecha",
  deactivate: "Desactivar",
  close: "Cerrar (baja)",
  reopen: "Reabrir",
};

const ROW_ACTION_ICON: Record<CoefficientAction, ReactNode> = {
  apply: <EventAvailableOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  correct: <EditCalendarOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  deactivate: <RemoveCircleOutlineIcon fontSize="small" sx={{ color: "error.main" }} />,
  close: <EventBusyOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  reopen: <LockOpenOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />,
};

const ROW_ACTION_TEXT_COLOR: Partial<Record<CoefficientAction, string>> = {
  deactivate: "error.main",
  reopen: "error.main",
};

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
  const theme = useTheme();
  const activeCommunityId = useActiveCommunity();
  const successDispatch = useSuccessDispatch();
  const {
    replaceCoefficients,
    isReplacing,
    activateCoefficients,
    isActivating,
    deactivateCoefficients,
    isDeactivating,
    closeCoefficients,
    isClosing,
    reopenCoefficients,
    isReopening,
  } = useSharingAgreementCoefficientMutations(plantId);

  // One shared in-flight gate across the row-dialog and batch-bar paths.
  // Each mutation's own isPending now spans its post-success refetch (see
  // useSharingAgreementCoefficientMutations), but a second lifecycle action
  // fired anywhere on this page while *any* of the four is still settling
  // would still read stale applicationState/endState — the endpoints treat
  // that as a legal correction, not an error, so nothing would reject it.
  // Disables every row's ⋯ button, the bar's own control, every dialog's
  // confirm button, and blocks dialog dismissal (Escape/backdrop/Cancel)
  // while any of the four is pending.
  const isAnyCoefficientActionPending = isActivating || isDeactivating || isClosing || isReopening;

  const [searchText, setSearchText] = useState("");
  const [applicationStateFilter, setApplicationStateFilter] = useState<SharingAgreementCoefficientApplicationStateFilter>("all");
  const debouncedSearchText = useDebounce(searchText, 500);

  const [isEditing, setIsEditing] = useState(false);
  const [inputUnit, setInputUnit] = useState<CoefficientInputUnit>("kw");
  const [rows, setRows] = useState<EditableCoefficientRow[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [activationErrors, setActivationErrors] = useState<string[] | null>(null);
  const errorPanelRef = useRef<HTMLDivElement>(null);

  // Lifecycle row-actions menu/dialogs (Part B) — entirely separate from the
  // batch-activation state above. Holds only the id, not the coefficient
  // object: every mutation invalidates the whole plant subtree, which can
  // replace row objects while the menu or a dialog is still open (a cascade,
  // or another session acting on the same agreement), so the row is
  // re-resolved live on every render instead of trusting a captured snapshot.
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);
  const [actionsMenuCoefficientId, setActionsMenuCoefficientId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<CoefficientAction | null>(null);
  const [dialogErrors, setDialogErrors] = useState<string[] | null>(null);

  useUnsavedChangesGuard(isEditing);

  useEffect(() => {
    if (activationErrors !== null) {
      errorPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activationErrors]);

  // Resolved from the *full* coefficients list, never filteredCoefficients —
  // a dialog must not close just because the user changed the filter behind
  // it, only because the underlying row genuinely changed or vanished.
  const actionsMenuCoefficient = actionsMenuCoefficientId
    ? coefficients.find((c) => c.coefficientId === actionsMenuCoefficientId)
    : undefined;

  useEffect(() => {
    if (!actionsMenuCoefficientId) return;
    // The row disappeared (removed from the agreement, or the id was stale
    // to begin with) — nothing failed, there's simply nothing left to act on.
    if (!actionsMenuCoefficient) {
      setActionsAnchorEl(null);
      setActionsMenuCoefficientId(null);
      setActiveDialog(null);
      setDialogErrors(null);
      return;
    }
    // The row is still there, but a cascade/refetch moved it out of the
    // state the open dialog was for (e.g. it closed elsewhere while
    // "Cerrar (baja)" was still open here) — close silently, same reasoning.
    if (
      activeDialog &&
      !getAvailableCoefficientActions(actionsMenuCoefficient.applicationState, actionsMenuCoefficient.endState).includes(activeDialog)
    ) {
      setActiveDialog(null);
      setDialogErrors(null);
    }
  }, [coefficients, actionsMenuCoefficientId, actionsMenuCoefficient, activeDialog]);

  const isDraft = agreementStatus === SharingAgreementResponseStatus.DRAFT;
  const kwModeAvailable = installedPowerKw !== undefined && installedPowerKw > 0;
  // Selection UI only ever applies to a published/superseded agreement — a
  // DRAFT is guaranteed all-PENDING/all-OPEN, but the activate/deactivate/
  // close/reopen endpoints reject DRAFT with 409, so offering checkboxes
  // there would just be a dead end.
  const showSelectionColumn = !isEditing && !isDraft;
  // The bar (and its page-clearing spacer) mount only once something is
  // selected — not merely because a PENDING coefficient exists. One shared
  // condition, computed once, so the bar and spacer can never disagree about
  // whether they're mounted.
  const isBatchBarMounted = selectedIds.size > 0;
  const applyDisabledReason = getCoefficientDateDisabledReason(
    selectedDate,
    dateValidationError,
    isAnyCoefficientActionPending,
    "Aplicando la fecha…",
  );

  const toggleSelected = (coefficientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(coefficientId)) next.delete(coefficientId);
      else next.add(coefficientId);
      return next;
    });
  };

  // Tri-state: indeterminate and unchecked both select every visible
  // pending row; only the fully-checked state deselects — the header
  // control always moves toward "select all" first, standard tri-state
  // behaviour. Never touches a row hidden by the filter in either direction.
  const handleToggleAllVisiblePending = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisiblePendingSelected) {
        visiblePendingCoefficients.forEach((c) => next.delete(c.coefficientId));
      } else {
        visiblePendingCoefficients.forEach((c) => next.add(c.coefficientId));
      }
      return next;
    });
  };

  // Unlike the header checkbox, clears the *real* selection — visible and
  // hidden alike. That asymmetry is the whole reason both controls exist.
  const handleClearSelection = () => setSelectedIds(new Set());

  const handleApplyDate = async () => {
    if (!selectedDate || applyDisabledReason) return;
    const result = await activateCoefficients(sharingAgreementId, Array.from(selectedIds), selectedDate);
    if (result.success) {
      setSelectedIds(new Set());
      setSelectedDate(null);
      setActivationErrors(null);
    } else {
      setActivationErrors(result.errorMessages);
    }
  };

  const handleOpenActionsMenu = (event: MouseEvent<HTMLElement>, coefficient: SharingAgreementPartitionCoefficientResponse) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsMenuCoefficientId(coefficient.coefficientId);
  };

  const handleCloseActionsMenu = () => setActionsAnchorEl(null);

  const handleSelectAction = (action: CoefficientAction) => {
    setActionsAnchorEl(null);
    setDialogErrors(null);
    setActiveDialog(action);
  };

  // A pending mutation can't be cancelled from here, and closing the dialog
  // while it's in flight would let the user re-open it (or another row's)
  // against data that isn't fresh yet — Escape, backdrop click and the
  // Cancel button all route through this one handler, so no-oping here
  // blocks all three at once.
  const handleCancelDialog = () => {
    if (isAnyCoefficientActionPending) return;
    setActiveDialog(null);
    setActionsMenuCoefficientId(null);
    setDialogErrors(null);
  };

  // "apply" (registering a PENDING row's first date) and "correct"
  // (rewriting an APPLIED row's date) are the same activate call — the
  // backend distinguishes them by the coefficient's current state, not by a
  // different endpoint.
  const handleConfirmActivate = async (date: Dayjs) => {
    if (!actionsMenuCoefficient) return;
    const result = await activateCoefficients(sharingAgreementId, [actionsMenuCoefficient.coefficientId], date);
    if (result.success) {
      setActiveDialog(null);
      setActionsMenuCoefficientId(null);
      setDialogErrors(null);
    } else {
      setDialogErrors(result.errorMessages);
    }
  };

  const handleConfirmDeactivateOrReopen = async () => {
    if (!actionsMenuCoefficient || (activeDialog !== "deactivate" && activeDialog !== "reopen")) return;
    const mutate = activeDialog === "deactivate" ? deactivateCoefficients : reopenCoefficients;
    const result = await mutate(sharingAgreementId, [actionsMenuCoefficient.coefficientId]);
    if (result.success) {
      setActiveDialog(null);
      setActionsMenuCoefficientId(null);
      setDialogErrors(null);
    } else {
      setDialogErrors(result.errorMessages);
    }
  };

  const handleConfirmClose = async (date: Dayjs) => {
    if (!actionsMenuCoefficient) return;
    const result = await closeCoefficients(sharingAgreementId, [actionsMenuCoefficient.coefficientId], date);
    if (result.success) {
      setActiveDialog(null);
      setActionsMenuCoefficientId(null);
      setDialogErrors(null);
    } else {
      setDialogErrors(result.errorMessages);
    }
  };

  // Anomaly means an explicit unexpected value, not missing data: a real DRAFT
  // is guaranteed all-PENDING/all-OPEN by the backend (APPLIED requires
  // publishing first; revert-to-draft is refused once anything is applied).
  // `endState` is optional in the generated types until backend issue B4
  // lands, so `undefined` must not trip this — that's absence of data, not an
  // unexpected end.
  const hasAnomalousRow = useMemo(
    () =>
      coefficients.some(
        (c) =>
          c.applicationState !== SharingAgreementPartitionCoefficientResponseApplicationState.PENDING ||
          (c.endState !== undefined && c.endState !== SharingAgreementPartitionCoefficientResponseEndState.OPEN),
      ),
    [coefficients],
  );
  const showStateColumns = !isDraft || hasAnomalousRow;

  const filteredCoefficients = useMemo(
    () => filterSharingAgreementCoefficients(coefficients, debouncedSearchText, applicationStateFilter),
    [coefficients, debouncedSearchText, applicationStateFilter],
  );

  // The set select-all/the header checkbox/the visible-vs-hidden count all
  // reason about — reuses filterSharingAgreementCoefficients rather than
  // reimplementing the search/status predicate.
  const visiblePendingCoefficients = useMemo(
    () => filteredCoefficients.filter(isPendingActivation),
    [filteredCoefficients],
  );

  // One pass over filteredCoefficients answers both "how much of the
  // selection is currently visible" (drives the tri-state checkbox, since
  // selectedIds only ever holds pending coefficientIds by construction) and
  // "how many selected rows are hidden by the filter" (drives the bar's
  // count text).
  const visibleSelectedCount = useMemo(
    () => filteredCoefficients.filter((c) => selectedIds.has(c.coefficientId)).length,
    [filteredCoefficients, selectedIds],
  );
  const hiddenSelectedCount = selectedIds.size - visibleSelectedCount;
  const allVisiblePendingSelected =
    visiblePendingCoefficients.length > 0 && visibleSelectedCount === visiblePendingCoefficients.length;
  const someVisiblePendingSelected = visibleSelectedCount > 0 && !allVisiblePendingSelected;
  const selectionCountText =
    hiddenSelectedCount > 0
      ? `${selectedIds.size} seleccionado${selectedIds.size === 1 ? "" : "s"} · ${hiddenSelectedCount} oculto${hiddenSelectedCount === 1 ? "" : "s"} por el filtro`
      : `${selectedIds.size} seleccionado${selectedIds.size === 1 ? "" : "s"}`;

  // Mounts only when a currently *visible* row actually has an action —
  // mirrors isBatchBarMounted's "mount only when there's something to act
  // on" rule. Gated on filteredCoefficients, not the full coefficients prop,
  // so the column also disappears when a filter leaves only non-actionable
  // rows visible (and reappears once the filter clears).
  const hasAnyRowActions = useMemo(
    () => filteredCoefficients.some((c) => getAvailableCoefficientActions(c.applicationState, c.endState).length > 0),
    [filteredCoefficients],
  );
  const showActionsColumn = !isEditing && !isDraft && hasAnyRowActions;

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
    const startingUnit: CoefficientInputUnit = kwModeAvailable ? "kw" : "coefficient";
    setInputUnit(startingUnit);
    setRows(buildEditableRowsFromCoefficients(coefficients, startingUnit, installedPowerKw));
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
      successDispatch("Coeficientes guardados.");
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
      {!isEditing && <SharingAgreementCoefficientSumCards coefficients={coefficients} agreementStatus={agreementStatus} />}

      {/* Row 1, editing mode: unit toggle (fixed shape) + search — search still
          filters `rows` while editing, so it must stay available here too. */}
      {isEditing && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
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
              <ToggleButton value="coefficient">Coeficiente</ToggleButton>
              <Tooltip title={kwModeAvailable ? "" : "Este acuerdo no tiene potencia instalada definida"}>
                <span>
                  <ToggleButton value="kw" disabled={!kwModeAvailable}>
                    kW
                  </ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>

          <SearchBar value={searchText} onChange={setSearchText} placeholder="Buscar por punto o CUPS" />
        </Box>
      )}

      {/* Row 1, read mode: three independent siblings — action button, filter chips,
          search — matching the canonical toolbar shape used across UsersPage,
          Partners.page, SupplyPointsPage and SharingAgreementsPage. Each sibling
          wraps on its own, so centering against justify-content: space-between
          holds regardless of which side grows taller. */}
      {!isEditing && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          {isDraft && (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={handleStartEditing}
                sx={{
                  background: theme.palette.primary.main,
                  boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Editar coeficientes
              </Button>
            </Box>
          )}

          {showStateColumns && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <FilterListIcon sx={{ color: colors.text.secondary, display: { xs: "none", sm: "block" } }} />
              {APPLICATION_STATE_FILTERS.map((state) => (
                <Chip
                  key={state}
                  label={state === "all" ? "Todos" : getApplicationStateLabel(state)}
                  onClick={() => setApplicationStateFilter(state)}
                  color={
                    applicationStateFilter === state
                      ? state === "all"
                        ? "primary"
                        : getApplicationStateColor(state)
                      : "default"
                  }
                  size="small"
                />
              ))}
            </Box>
          )}

          {/* Mobile-only: the desktop equivalent lives in the table head's
              checkbox column, which doesn't exist on the card list. Labelled
              rather than a bare checkbox, since there's no column header
              here to imply what it does. */}
          {showSelectionColumn && visiblePendingCoefficients.length > 0 && (
            <Box sx={{ display: { xs: "flex", sm: "none" }, alignItems: "center", gap: 0.5 }}>
              <Checkbox
                checked={allVisiblePendingSelected}
                indeterminate={someVisiblePendingSelected}
                onChange={handleToggleAllVisiblePending}
                inputProps={{ "aria-label": "Seleccionar todos los pendientes" }}
              />
              <Typography variant="body2">Seleccionar pendientes</Typography>
            </Box>
          )}

          <SearchBar value={searchText} onChange={setSearchText} placeholder="Buscar por punto o CUPS" />
        </Box>
      )}

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
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            mb: 2,
          }}
        >
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
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={handleCancelEditing} disabled={isReplacing}>
              Cancelar
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!canSave || isReplacing}>
              {isReplacing ? "Guardando…" : "Guardar"}
            </Button>
          </Box>
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
                  {showSelectionColumn && (
                    <TableCell padding="checkbox">
                      {visiblePendingCoefficients.length > 0 && (
                        <Checkbox
                          checked={allVisiblePendingSelected}
                          indeterminate={someVisiblePendingSelected}
                          onChange={handleToggleAllVisiblePending}
                          inputProps={{ "aria-label": "Seleccionar todos los pendientes" }}
                        />
                      )}
                    </TableCell>
                  )}
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
                  {showStateColumns && (
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Estado de aplicación
                      </Typography>
                    </TableCell>
                  )}
                  {showStateColumns && (
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Estado de fin
                      </Typography>
                    </TableCell>
                  )}
                  {isEditing && <TableCell />}
                  {showActionsColumn && <TableCell padding="checkbox" />}
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
                        showStateColumns={showStateColumns}
                      />
                    ))
                  : filteredCoefficients.map((coefficient) => (
                      <SharingAgreementCoefficientTableRow
                        key={coefficient.coefficientId}
                        coefficient={coefficient}
                        installedPowerKw={installedPowerKw}
                        showStateColumns={showStateColumns}
                        showSelectionColumn={showSelectionColumn}
                        selected={selectedIds.has(coefficient.coefficientId)}
                        onToggleSelected={() => toggleSelected(coefficient.coefficientId)}
                        showActionsColumn={showActionsColumn}
                        onOpenActionsMenu={handleOpenActionsMenu}
                        actionsDisabled={isAnyCoefficientActionPending}
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
                    showStateColumns={showStateColumns}
                  />
                ))
              : filteredCoefficients.map((coefficient) => (
                  <SharingAgreementCoefficientCard
                    key={coefficient.coefficientId}
                    coefficient={coefficient}
                    installedPowerKw={installedPowerKw}
                    showStateColumns={showStateColumns}
                    showSelectionColumn={showSelectionColumn}
                    selected={selectedIds.has(coefficient.coefficientId)}
                    onToggleSelected={() => toggleSelected(coefficient.coefficientId)}
                    showActionsColumn={showActionsColumn}
                    onOpenActionsMenu={handleOpenActionsMenu}
                    actionsDisabled={isAnyCoefficientActionPending}
                  />
                ))}
          </Box>
        </>
      )}

      {activationErrors && (
        <Box ref={errorPanelRef}>
          <Alert severity="error" onClose={() => setActivationErrors(null)} sx={{ mb: 2 }}>
            No se ha activado ningún coeficiente.
            {activationErrors.length > 0 ? (
              activationErrors.map((message, index) => (
                <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                  • {message}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                No se ha podido activar la selección. Inténtalo de nuevo en unos instantes.
              </Typography>
            )}
          </Alert>
        </Box>
      )}

      {isBatchBarMounted && (
        <Box
          sx={{
            // Fixed at every breakpoint now — static on desktop left the bar
            // far below the fold with a long table, off-screen from the rows
            // being selected at the top. left mirrors the layout's own
            // sidebar offset via the CSS variable it exposes (0 when there's
            // no such ancestor, e.g. in isolation), so the bar's content
            // lines up with the table column above it rather than spanning
            // the true viewport edge-to-edge.
            position: "fixed",
            bottom: 0,
            left: "var(--content-inset-left, 0px)",
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            height: { xs: BATCH_BAR_HEIGHT_MOBILE, sm: BATCH_BAR_HEIGHT_DESKTOP },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 1.5,
            p: 2,
            bgcolor: colors.background.paper,
            borderTop: `1px solid ${colors.divider}`,
            boxSizing: "border-box",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectionCountText}
            </Typography>
            <Button variant="text" size="small" onClick={handleClearSelection}>
              Limpiar selección
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, gap: 1.5 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                value={selectedDate}
                onChange={(value) => setSelectedDate(value)}
                maxDate={dayjs()}
                onError={(reason) => setDateValidationError(reason)}
                slotProps={{
                  textField: {
                    size: "small",
                    helperText: "No se permiten fechas futuras",
                    sx: { "& .MuiOutlinedInput-root": { fontSize: fontSizes.lg, height: "40px" } },
                  },
                }}
              />
            </LocalizationProvider>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Button
                variant="contained"
                onClick={handleApplyDate}
                disabled={applyDisabledReason !== null}
                sx={{ boxShadow: shadows.medium }}
              >
                {isActivating ? <CircularProgress size={24} color="inherit" /> : "Aplicar fecha a selección"}
              </Button>
              <Typography variant="caption" sx={{ color: colors.text.subtle, minHeight: "1.2em" }}>
                {applyDisabledReason ?? ""}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          height: {
            xs: isBatchBarMounted ? BATCH_BAR_HEIGHT_MOBILE : 0,
            sm: isBatchBarMounted ? BATCH_BAR_HEIGHT_DESKTOP : 0,
          },
        }}
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

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl)}
        onClose={handleCloseActionsMenu}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
      >
        {(actionsMenuCoefficient
          ? getAvailableCoefficientActions(actionsMenuCoefficient.applicationState, actionsMenuCoefficient.endState)
          : []
        ).flatMap((action, index) => [
          ...(index === 1 ? [<Divider key="divider" />] : []),
          <MenuItem key={action} onClick={() => handleSelectAction(action)}>
            <ListItemIcon>{ROW_ACTION_ICON[action]}</ListItemIcon>
            <ListItemText sx={ROW_ACTION_TEXT_COLOR[action] ? { color: ROW_ACTION_TEXT_COLOR[action] } : undefined}>
              {ROW_ACTION_LABEL[action]}
            </ListItemText>
          </MenuItem>,
        ])}
      </Menu>

      <ApplyCoefficientDateConfirmationModal
        isOpen={activeDialog === "apply"}
        coefficients={actionsMenuCoefficient ? [actionsMenuCoefficient] : undefined}
        isPending={isAnyCoefficientActionPending}
        errorMessages={dialogErrors}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmActivate}
      />

      <CorrectCoefficientDateConfirmationModal
        isOpen={activeDialog === "correct"}
        coefficients={actionsMenuCoefficient ? [actionsMenuCoefficient] : undefined}
        isPending={isAnyCoefficientActionPending}
        errorMessages={dialogErrors}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmActivate}
      />

      <DeactivateOrReopenCoefficientConfirmationModal
        isOpen={activeDialog === "deactivate" || activeDialog === "reopen"}
        action={activeDialog === "reopen" ? "reopen" : "deactivate"}
        coefficients={actionsMenuCoefficient ? [actionsMenuCoefficient] : undefined}
        isPending={isAnyCoefficientActionPending}
        errorMessages={dialogErrors}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmDeactivateOrReopen}
      />

      <CloseCoefficientConfirmationModal
        isOpen={activeDialog === "close"}
        coefficients={actionsMenuCoefficient ? [actionsMenuCoefficient] : undefined}
        isPending={isAnyCoefficientActionPending}
        errorMessages={dialogErrors}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmClose}
      />
    </Paper>
  );
};
