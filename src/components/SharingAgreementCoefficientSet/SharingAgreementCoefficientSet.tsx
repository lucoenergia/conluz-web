import { useEffect, useMemo, useRef, useState, type FC, type MouseEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Menu,
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
import type { Dayjs } from "dayjs";
import "dayjs/locale/es";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import { colors, fontSizes, radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { EmptyState } from "../EmptyState";
import { SectionHeading } from "../SectionHeading";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { SearchBar } from "../SearchBar/SearchBar";
import { SharingAgreementCoefficientSumGauges } from "../SharingAgreementCoefficientSumGauges";
import { AddSupplyDialog } from "../AddSupplyDialog";
import type { AddSupplyDialogProps } from "../AddSupplyDialog";
import { SharingAgreementCoefficientCard, SharingAgreementCoefficientTableRow } from "../SharingAgreementCoefficientRow";
import { CoefficientActionsMenuItems } from "../CoefficientActionsMenu";
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
  isFullyAvailable,
  summarizeSelectionActions,
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
import {
  useSharingAgreementCoefficientMutations,
  type CoefficientActivationResult,
} from "../../pages/production/useSharingAgreementCoefficientMutations";
import {
  BATCH_BAR_HEIGHT_DESKTOP,
  BATCH_BAR_HEIGHT_MOBILE,
} from "../../pages/production/sharingAgreementBatchBar";


export interface SharingAgreementCoefficientSetProps {
  plantId: string;
  sharingAgreementId: string;
  coefficients: SharingAgreementPartitionCoefficientResponse[];
  installedPowerKw: number | undefined;
  agreementStatus: StatusValue | undefined;
  /**
   * Bumped by the page when another surface — the next-step banner — asks to
   * start editing. A nonce rather than a controlled boolean: the rows are seeded
   * here, from the coefficients this component already holds, so the request has
   * to arrive as an event rather than as state to mirror.
   */
  editRequestId?: number;
  /**
   * Opens the TXT import dialog, which the page owns. Importing replaces the
   * whole coefficient set, so it belongs beside manual editing rather than in
   * the distributor-file panel where it used to live.
   */
  onImportRequest?: () => void;
  /**
   * Bumped by the application panel, or by the next-step banner at stage 5, to
   * start recording application dates. Selecting the pending rows has to happen
   * here, where the selection lives.
   */
  registerDatesRequestId?: number;
  /**
   * False when the next-step banner is already promoting these same two actions
   * — which it does exactly while authoring *is* the current step. Rendering
   * both would put two identically-labelled buttons on one screen.
   */
  showAuthoringActions?: boolean;
  /**
   * Reports whether the fixed batch bar is currently up. The spacer that keeps
   * content clear of it has to live on the page, not in this panel: the bar is
   * `position: fixed` over the whole viewport, so reserving room here left every
   * section below — the distributor-file panel — still covered by it.
   */
  onBatchBarMountedChange?: (isMounted: boolean) => void;
}

// A deliberate 3-chip cut for this slice: applicationState only. The design
// mock-up shows a fourth "Cerrados" chip keyed on endState instead — left for
// a later issue, not an oversight.
const SPLIT_SECTION_DESCRIPTION =
  "Qué parte de la producción de la planta corresponde a cada punto de suministro. " +
  "Los coeficientes reparten la producción y son la base del cálculo de autoconsumo y excedentes en tiempo real.";

const APPLICATION_STATE_FILTERS: SharingAgreementCoefficientApplicationStateFilter[] = [
  "all",
  SharingAgreementPartitionCoefficientResponseApplicationState.PENDING,
  SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
];

interface BatchActionErrorState {
  action: CoefficientAction;
  errorMessages: string[];
}

/**
 * The one dialog-state value shared by the row path (source: "row", always
 * a single target) and the batch path (source: "batch", the whole
 * selection). `source` decides where a rejection is reported: "row" keeps
 * a dialog-local error and the date the admin typed; "batch" closes the
 * dialog and reports through the page-level persistent panel instead,
 * naming every affected CUPS — see handleDialogOutcome.
 */
interface ActiveCoefficientDialog {
  action: CoefficientAction;
  targetIds: readonly [string, ...string[]];
  source: "row" | "batch";
}

// Copy for the persistent batch-rejection panel, keyed by action rather than
// hardcoded to activation — "apply"'s wording says "activado"/"activar"
// (matching the underlying mutation, not the row-menu label) to keep it
// byte-identical to what shipped before this action was parameterised.
const BATCH_ACTION_ERROR_COPY: Record<CoefficientAction, { heading: string; fallback: string }> = {
  apply: {
    heading: "No se ha activado ningún coeficiente.",
    fallback: "No se ha podido activar la selección. Inténtalo de nuevo en unos instantes.",
  },
  correct: {
    heading: "No se ha corregido la fecha de ningún coeficiente.",
    fallback: "No se ha podido corregir la selección. Inténtalo de nuevo en unos instantes.",
  },
  deactivate: {
    heading: "No se ha desactivado ningún coeficiente.",
    fallback: "No se ha podido desactivar la selección. Inténtalo de nuevo en unos instantes.",
  },
  close: {
    heading: "No se ha cerrado ningún coeficiente.",
    fallback: "No se ha podido cerrar la selección. Inténtalo de nuevo en unos instantes.",
  },
  reopen: {
    heading: "No se ha reabierto ningún coeficiente.",
    fallback: "No se ha podido reabrir la selección. Inténtalo de nuevo en unos instantes.",
  },
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
  editRequestId = 0,
  onImportRequest,
  registerDatesRequestId = 0,
  showAuthoringActions = true,
  onBatchBarMountedChange,
}) => {
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
  // Debounce applies to narrowing the list, not to widening it. Clearing the
  // field — whether the user did it or "Registrar fechas" did — takes effect at
  // once, so a selection made straight afterwards is never reported as partly
  // hidden behind a filter that is already gone.
  const effectiveSearchText = searchText.trim() === "" ? "" : debouncedSearchText;

  const [isEditing, setIsEditing] = useState(false);
  const [inputUnit, setInputUnit] = useState<CoefficientInputUnit>("kw");
  const [rows, setRows] = useState<EditableCoefficientRow[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionError, setBatchActionError] = useState<BatchActionErrorState | null>(null);
  const errorPanelRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The row `⋯` menu and the bar's `Acciones` menu each own their own
  // anchor — distinct popovers, so one's positioning can never leak into
  // the other's, even though only one is ever open in practice.
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);
  const [actionsMenuCoefficientId, setActionsMenuCoefficientId] = useState<string | null>(null);
  const [batchActionsAnchorEl, setBatchActionsAnchorEl] = useState<HTMLElement | null>(null);

  // Holds only ids, not coefficient objects: every mutation invalidates the
  // whole plant subtree, which can replace row objects while a dialog is
  // still open (a cascade, or another session acting on the same
  // agreement), so targets are re-resolved live on every render instead of
  // trusting a captured snapshot.
  const [activeDialog, setActiveDialog] = useState<ActiveCoefficientDialog | null>(null);
  const [dialogErrors, setDialogErrors] = useState<string[] | null>(null);

  useUnsavedChangesGuard(isEditing);

  useEffect(() => {
    if (batchActionError !== null) {
      errorPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [batchActionError]);

  // Resolved from the *full* coefficients list, never filteredCoefficients —
  // a menu/dialog must not close just because the user changed the filter
  // behind it, only because the underlying target genuinely changed or
  // vanished.
  const actionsMenuCoefficient = actionsMenuCoefficientId
    ? coefficients.find((c) => c.coefficientId === actionsMenuCoefficientId)
    : undefined;
  const targetCoefficients = useMemo(
    () => (activeDialog ? coefficients.filter((c) => activeDialog.targetIds.includes(c.coefficientId)) : []),
    [activeDialog, coefficients],
  );
  const dialogCoefficients =
    targetCoefficients.length > 0
      ? (targetCoefficients as [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]])
      : undefined;

  // The row `⋯` menu closes if its own coefficient disappears while open —
  // nothing failed, there's simply nothing left to act on.
  useEffect(() => {
    if (!actionsMenuCoefficientId) return;
    if (!actionsMenuCoefficient) {
      setActionsAnchorEl(null);
      setActionsMenuCoefficientId(null);
    }
  }, [actionsMenuCoefficientId, actionsMenuCoefficient]);

  // A dialog (row- or batch-sourced) closes silently — no error — the
  // moment any one of its targets no longer supports the action it was
  // opened for, whether the row vanished entirely or a cascade/refetch
  // moved it to a different state (e.g. it closed elsewhere while "Cerrar
  // (baja)" was still open here for it, or for a sibling in the same
  // batch). The four endpoints are atomic, so one ineligible target already
  // guarantees the request would fail — better to close than let the admin
  // submit into a rejection they can't act on.
  useEffect(() => {
    if (!activeDialog) return;
    const stillValid = activeDialog.targetIds.every((id) => {
      const coefficient = coefficients.find((c) => c.coefficientId === id);
      return (
        !!coefficient &&
        getAvailableCoefficientActions(coefficient.applicationState, coefficient.endState).includes(activeDialog.action)
      );
    });
    if (!stillValid) {
      setActiveDialog(null);
      setDialogErrors(null);
    }
  }, [coefficients, activeDialog]);

  const isDraft = agreementStatus === SharingAgreementResponseStatus.DRAFT;
  const kwModeAvailable = installedPowerKw !== undefined && installedPowerKw > 0;
  // Superseded is a closed CYCLE, not a read-only record: reopening a closed
  // coefficient revives the agreement, and this selection plus the row actions
  // menu are the only routes to it. "Closed" is therefore expressed by the
  // lifecycle rail and by the applied sum reading as a closing figure — never
  // by removing controls that still do something.
  //
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

  useEffect(() => {
    onBatchBarMountedChange?.(isBatchBarMounted);
  }, [isBatchBarMounted, onBatchBarMountedChange]);

  const toggleSelected = (coefficientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(coefficientId)) next.delete(coefficientId);
      else next.add(coefficientId);
      return next;
    });
  };

  // A successful row-path action is a specific, more recent decision about
  // that one row, superseding whatever the selection expressed earlier —
  // without this, a later batch action either reports "N-1 of N eligible"
  // with no indication of which row to deselect (possibly one hidden by the
  // filter), or silently overwrites this row's individual correction. Never
  // called on failure: an untouched selection is exactly what a failed
  // action should leave behind.
  const dropFromSelection = (coefficientId: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(coefficientId)) return prev;
      const next = new Set(prev);
      next.delete(coefficientId);
      return next;
    });
  };

  // Tri-state: indeterminate and unchecked both select every visible
  // actionable row; only the fully-checked state deselects — the header
  // control always moves toward "select all" first, standard tri-state
  // behaviour. Never touches a row hidden by the filter in either direction.
  const handleToggleAllVisibleActionable = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleActionableSelected) {
        visibleActionableCoefficients.forEach((c) => next.delete(c.coefficientId));
      } else {
        visibleActionableCoefficients.forEach((c) => next.add(c.coefficientId));
      }
      return next;
    });
  };

  // Unlike the header checkbox, clears the *real* selection — visible and
  // hidden alike. That asymmetry is the whole reason both controls exist.
  const handleClearSelection = () => setSelectedIds(new Set());

  /**
   * Show the coefficients still waiting for a date, and bring them into view.
   *
   * It deliberately does NOT select anything. Choosing which points share an
   * application date is the admin's judgement — the distributor rarely applies
   * them all on the same day — and a screen that arrives with 29 rows already
   * ticked invites a bulk action nobody actually decided on. Narrow the list,
   * then let them pick.
   *
   * The search is cleared alongside the filter so a leftover query cannot hide
   * part of what the filter just surfaced.
   */
  const lastHandledRegisterDatesRequestId = useRef(registerDatesRequestId);
  useEffect(() => {
    if (registerDatesRequestId === lastHandledRegisterDatesRequestId.current) return;
    lastHandledRegisterDatesRequestId.current = registerDatesRequestId;

    setApplicationStateFilter(SharingAgreementPartitionCoefficientResponseApplicationState.PENDING);
    setSearchText("");
    setSelectedIds(new Set());
    // The request came from a panel above the table, which on a long agreement
    // is well off screen.
    panelRef.current?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [registerDatesRequestId]);

  const handleOpenActionsMenu = (event: MouseEvent<HTMLElement>, coefficient: SharingAgreementPartitionCoefficientResponse) => {
    setActionsAnchorEl(event.currentTarget);
    setActionsMenuCoefficientId(coefficient.coefficientId);
  };

  const handleCloseActionsMenu = () => setActionsAnchorEl(null);

  const handleSelectRowAction = (action: CoefficientAction) => {
    if (!actionsMenuCoefficientId) return;
    setActionsAnchorEl(null);
    setDialogErrors(null);
    setActiveDialog({ action, targetIds: [actionsMenuCoefficientId], source: "row" });
  };

  const handleOpenBatchActionsMenu = (event: MouseEvent<HTMLElement>) => setBatchActionsAnchorEl(event.currentTarget);
  const handleCloseBatchActionsMenu = () => setBatchActionsAnchorEl(null);

  const handleSelectBatchAction = (action: CoefficientAction) => {
    setBatchActionsAnchorEl(null);
    if (selectedIds.size === 0) return;
    setActiveDialog({ action, targetIds: Array.from(selectedIds) as [string, ...string[]], source: "batch" });
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

  // Routes a settled mutation result by the dialog's own source: "row" keeps
  // Part B's dialog-local error and drops only that one row from a live
  // selection; "batch" closes the dialog on rejection (no dialog-local error
  // ever shown there) and reports through the page-level persistent panel
  // instead, or clears the whole selection on success.
  const handleDialogOutcome = (result: CoefficientActivationResult, dialog: ActiveCoefficientDialog) => {
    if (result.success) {
      if (dialog.source === "row") {
        dropFromSelection(dialog.targetIds[0]);
      } else {
        setSelectedIds(new Set());
      }
      setActiveDialog(null);
      setActionsMenuCoefficientId(null);
      setDialogErrors(null);
    } else if (dialog.source === "row") {
      setDialogErrors(result.errorMessages);
    } else {
      setActiveDialog(null);
      setActionsMenuCoefficientId(null);
      setBatchActionError({ action: dialog.action, errorMessages: result.errorMessages });
    }
  };

  // "apply" (registering a PENDING row's first date) and "correct"
  // (rewriting an APPLIED row's date) are the same activate call — the
  // backend distinguishes them by the coefficient's current state, not by a
  // different endpoint.
  const handleConfirmActivate = async (date: Dayjs) => {
    if (!activeDialog) return;
    const dialog = activeDialog;
    const result = await activateCoefficients(sharingAgreementId, [...dialog.targetIds], date);
    handleDialogOutcome(result, dialog);
  };

  const handleConfirmDeactivateOrReopen = async () => {
    if (!activeDialog || (activeDialog.action !== "deactivate" && activeDialog.action !== "reopen")) return;
    const dialog = activeDialog;
    const mutate = dialog.action === "deactivate" ? deactivateCoefficients : reopenCoefficients;
    const result = await mutate(sharingAgreementId, [...dialog.targetIds]);
    handleDialogOutcome(result, dialog);
  };

  const handleConfirmClose = async (date: Dayjs) => {
    if (!activeDialog) return;
    const dialog = activeDialog;
    const result = await closeCoefficients(sharingAgreementId, [...dialog.targetIds], date);
    handleDialogOutcome(result, dialog);
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
  // Extra columns appearing is the CONSEQUENCE of the anomaly; on its own it
  // renders a broken draft as an ordinary one. This is the message.
  const hasDraftAnomaly = isDraft && hasAnomalousRow;

  const filteredCoefficients = useMemo(
    () => filterSharingAgreementCoefficients(coefficients, effectiveSearchText, applicationStateFilter),
    [coefficients, effectiveSearchText, applicationStateFilter],
  );

  // The set select-all/the header checkbox/the visible-vs-hidden count all
  // reason about — any row with at least one available action, not only a
  // PENDING one. Reuses filterSharingAgreementCoefficients rather than
  // reimplementing the search/status predicate.
  const visibleActionableCoefficients = useMemo(
    () => filteredCoefficients.filter((c) => getAvailableCoefficientActions(c.applicationState, c.endState).length > 0),
    [filteredCoefficients],
  );

  // One pass over filteredCoefficients answers both "how much of the
  // selection is currently visible" (drives the tri-state checkbox) and "how
  // many selected rows are hidden by the filter" (drives the bar's count
  // text). selectedIds can hold any actionable coefficient's id now, not
  // only PENDING ones — checked live against filteredCoefficients either way.
  const visibleSelectedCount = useMemo(
    () => filteredCoefficients.filter((c) => selectedIds.has(c.coefficientId)).length,
    [filteredCoefficients, selectedIds],
  );
  const hiddenSelectedCount = selectedIds.size - visibleSelectedCount;
  const allVisibleActionableSelected =
    visibleActionableCoefficients.length > 0 && visibleSelectedCount === visibleActionableCoefficients.length;
  const someVisibleActionableSelected = visibleSelectedCount > 0 && !allVisibleActionableSelected;
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

  // How many of the currently open dialog's targets are hidden by the
  // filter behind it — always 0 for the row path (a hidden row can't open
  // its own menu), non-zero for a batch dialog whose selection spans hidden
  // rows too.
  const hiddenTargetCount = activeDialog
    ? activeDialog.targetIds.filter((id) => !filteredCoefficients.some((c) => c.coefficientId === id)).length
    : 0;

  // The whole selection resolved against the current coefficient data,
  // hidden rows included — so a row acted on individually is re-evaluated
  // here too once its own mutation's refetch lands, with no extra handling.
  const selectedCoefficients = useMemo(
    () => coefficients.filter((c) => selectedIds.has(c.coefficientId)),
    [coefficients, selectedIds],
  );
  const selectionActionSummary = useMemo(() => summarizeSelectionActions(selectedCoefficients), [selectedCoefficients]);

  const filteredRows = useMemo(() => filterEditableRows(rows, effectiveSearchText), [rows, effectiveSearchText]);

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
    setIsEditing(true);
  };

  // The page asks for the editor by bumping `editRequestId`. Seeding stays here
  // because the rows are built from the coefficients this component holds; the
  // mount value is ignored so a fresh page never opens straight into the editor.
  const lastHandledEditRequestId = useRef(editRequestId);
  useEffect(() => {
    if (editRequestId === lastHandledEditRequestId.current) return;
    lastHandledEditRequestId.current = editRequestId;
    handleStartEditing();
    // The request came from the banner at the top of the page, so the editor the
    // user just asked for is off screen. Bring the section to them rather than
    // opening a table they cannot see.
    panelRef.current?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    // `handleStartEditing` is re-created every render; depending on it would
    // re-run this on every render instead of on every request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequestId]);

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

  const sectionHeading = (
    <SectionHeading title="Reparto" description={SPLIT_SECTION_DESCRIPTION} />
  );

  /**
   * The two ways of authoring a split, side by side and equally weighted.
   * Importing a TXT replaces the whole coefficient set, which makes it an
   * authoring action, not a file-panel action — it used to sit next to
   * "Generar fichero", where it read as a way of managing the stored file.
   * Both are DRAFT-only: `PUT .../partition-coefficients` and `POST .../file`
   * both 409 outside DRAFT.
   */
  const authoringActions = isDraft && showAuthoringActions ? (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2.5 }}>
      <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={handleStartEditing}>
        Editar a mano
      </Button>
      {onImportRequest && (
        <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={onImportRequest}>
          Importar TXT
        </Button>
      )}
    </Box>
  ) : null;

  const supplyPicker = isDraft ? (
    <AddSupplyDialog
      isOpen={isPickerOpen}
      communityId={activeCommunityId}
      alreadyAddedSupplyIds={alreadyAddedSupplyIds}
      onCancel={() => setIsPickerOpen(false)}
      onConfirm={handleConfirmAddSupplies}
    />
  ) : null;

  if (coefficients.length === 0 && !isEditing) {
    return (
      <Paper ref={panelRef} elevation={0} sx={sxStyles.softPanel}>
        {sectionHeading}
        {authoringActions}
        <EmptyState
          icon={HandshakeOutlinedIcon}
          title="Sin coeficientes de reparto"
          subtitle="Añade los puntos de suministro y su coeficiente a mano, o importa el fichero TXT que ya tengas."
        />
        {supplyPicker}
      </Paper>
    );
  }

  return (
    <Paper ref={panelRef} elevation={0} sx={sxStyles.softPanel}>
      {sectionHeading}

      {!isEditing && <SharingAgreementCoefficientSumGauges coefficients={coefficients} agreementStatus={agreementStatus} />}

      {!isEditing && installedPowerKw !== undefined && (
        <Typography variant="body2" sx={{ color: colors.text.subtle, mb: 2 }}>
          Potencia instalada de la planta: {formatKilowatts(installedPowerKw)}
        </Typography>
      )}

      {hasDraftAnomaly && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este borrador contiene coeficientes marcados como aplicados o cerrados, algo que no debería ser posible en un
          borrador. Revisa los datos con la distribuidora antes de poner el acuerdo en vigor o eliminarlo.
        </Alert>
      )}

      {!isEditing && authoringActions}

      {/* Stated above the list and visible without hover: "Potencia asignada" is
          the single most misread figure on this page. It is a share of installed
          power, not an entitlement to energy. */}
      {!isEditing && (
        <Typography
          sx={{ fontSize: fontSizes.lg, lineHeight: 1.5, color: colors.text.body, mb: 2.5, textWrap: "pretty" }}
        >
          <Box component="strong" sx={{ fontWeight: 600 }}>
            Potencia asignada:
          </Box>{" "}
          parte de la potencia instalada que corresponde a cada punto según su coeficiente. No es potencia garantizada:
          la energía que recibe depende de lo que produzca la planta en cada momento.
        </Typography>
      )}

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
          {showSelectionColumn && visibleActionableCoefficients.length > 0 && (
            <Box sx={{ display: { xs: "flex", sm: "none" }, alignItems: "center", gap: 0.5 }}>
              <Checkbox
                checked={allVisibleActionableSelected}
                indeterminate={someVisibleActionableSelected}
                onChange={handleToggleAllVisibleActionable}
                inputProps={{ "aria-label": "Seleccionar todas las filas visibles" }}
              />
              <Typography variant="body2">Seleccionar todas</Typography>
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
                      {visibleActionableCoefficients.length > 0 && (
                        <Checkbox
                          checked={allVisibleActionableSelected}
                          indeterminate={someVisibleActionableSelected}
                          onChange={handleToggleAllVisibleActionable}
                          inputProps={{ "aria-label": "Seleccionar todas las filas visibles" }}
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
                      {isEditing && inputUnit === "kw" ? "Potencia (kW)" : "Coeficiente (%)"}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      {isEditing && inputUnit === "kw" ? "% equivalente" : "Potencia asignada"}
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

      {batchActionError && (
        <Box ref={errorPanelRef}>
          <Alert severity="error" onClose={() => setBatchActionError(null)} sx={{ mb: 2 }}>
            {BATCH_ACTION_ERROR_COPY[batchActionError.action].heading}
            {batchActionError.errorMessages.length > 0 ? (
              batchActionError.errorMessages.map((message, index) => (
                <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                  • {message}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {BATCH_ACTION_ERROR_COPY[batchActionError.action].fallback}
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

          <Button
            variant="contained"
            onClick={handleOpenBatchActionsMenu}
            disabled={isAnyCoefficientActionPending || selectionActionSummary.length === 0}
            sx={{ boxShadow: shadows.medium }}
          >
            Acciones
          </Button>
        </Box>
      )}

      <Menu
        anchorEl={batchActionsAnchorEl}
        open={Boolean(batchActionsAnchorEl)}
        onClose={handleCloseBatchActionsMenu}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{ list: { disabledItemsFocusable: true } }}
      >
        <CoefficientActionsMenuItems
          items={selectionActionSummary.map((item) => ({
            action: item.action,
            disabledReason: isFullyAvailable(item)
              ? undefined
              : `Solo aplicable a ${item.eligibleCount} de ${item.selectedCount} seleccionados`,
          }))}
          onSelectAction={handleSelectBatchAction}
        />
      </Menu>

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
        <CoefficientActionsMenuItems
          items={(actionsMenuCoefficient
            ? getAvailableCoefficientActions(actionsMenuCoefficient.applicationState, actionsMenuCoefficient.endState)
            : []
          ).map((action) => ({ action }))}
          onSelectAction={handleSelectRowAction}
        />
      </Menu>

      <ApplyCoefficientDateConfirmationModal
        isOpen={activeDialog?.action === "apply"}
        coefficients={dialogCoefficients}
        hiddenCount={hiddenTargetCount}
        isPending={isAnyCoefficientActionPending}
        errorMessages={activeDialog?.source === "row" ? dialogErrors : null}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmActivate}
      />

      <CorrectCoefficientDateConfirmationModal
        isOpen={activeDialog?.action === "correct"}
        coefficients={dialogCoefficients}
        hiddenCount={hiddenTargetCount}
        isPending={isAnyCoefficientActionPending}
        errorMessages={activeDialog?.source === "row" ? dialogErrors : null}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmActivate}
      />

      <DeactivateOrReopenCoefficientConfirmationModal
        isOpen={activeDialog?.action === "deactivate" || activeDialog?.action === "reopen"}
        action={activeDialog?.action === "reopen" ? "reopen" : "deactivate"}
        coefficients={dialogCoefficients}
        hiddenCount={hiddenTargetCount}
        isPending={isAnyCoefficientActionPending}
        errorMessages={activeDialog?.source === "row" ? dialogErrors : null}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmDeactivateOrReopen}
      />

      <CloseCoefficientConfirmationModal
        isOpen={activeDialog?.action === "close"}
        coefficients={dialogCoefficients}
        hiddenCount={hiddenTargetCount}
        isPending={isAnyCoefficientActionPending}
        errorMessages={activeDialog?.source === "row" ? dialogErrors : null}
        onCancel={handleCancelDialog}
        onConfirm={handleConfirmClose}
      />
    </Paper>
  );
};
