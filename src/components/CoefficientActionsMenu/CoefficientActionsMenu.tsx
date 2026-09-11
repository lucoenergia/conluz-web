import type { FC, ReactNode } from "react";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import type { CoefficientAction } from "../../pages/production/sharingAgreementCoefficientState";

const COEFFICIENT_ACTION_LABEL: Record<CoefficientAction, string> = {
  apply: "Registrar fecha",
  correct: "Corregir fecha",
  deactivate: "Desactivar",
  close: "Cerrar (baja)",
  reopen: "Reabrir",
};

const COEFFICIENT_ACTION_ICON: Record<CoefficientAction, ReactNode> = {
  apply: <EventAvailableOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  correct: <EditCalendarOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  deactivate: <RemoveCircleOutlineIcon fontSize="small" sx={{ color: "error.main" }} />,
  close: <EventBusyOutlinedIcon fontSize="small" sx={{ color: "primary.main" }} />,
  reopen: <LockOpenOutlinedIcon fontSize="small" sx={{ color: "error.main" }} />,
};

const COEFFICIENT_ACTION_TEXT_COLOR: Partial<Record<CoefficientAction, string>> = {
  deactivate: "error.main",
  reopen: "error.main",
};

// Date actions register or rewrite a date; lifecycle actions change whether
// the coefficient contributes at all. Grouped by this meaning, not by
// position — a divider renders only between two non-empty groups, never as
// a lone leading/trailing rule for a single-group menu (e.g. a PENDING
// row's lone "apply", which has no lifecycle group to separate from).
const DATE_ACTIONS: ReadonlySet<CoefficientAction> = new Set(["apply", "correct"]);

export interface CoefficientActionsMenuItemsProps {
  /** Already in canonical order (see ACTION_ORDER in sharingAgreementCoefficientState.ts) — this component groups, it doesn't sort. */
  actions: readonly CoefficientAction[];
  onSelectAction: (action: CoefficientAction) => void;
}

/**
 * Renders the MenuItems (and grouping divider) for a coefficient action
 * menu's children — the caller owns the surrounding `<Menu>`. Shared between
 * the row's `⋯` menu and the batch bar's `Acciones` menu.
 */
export const CoefficientActionsMenuItems: FC<CoefficientActionsMenuItemsProps> = ({ actions, onSelectAction }) => {
  const dateActions = actions.filter((action) => DATE_ACTIONS.has(action));
  const lifecycleActions = actions.filter((action) => !DATE_ACTIONS.has(action));

  const renderItem = (action: CoefficientAction) => (
    <MenuItem key={action} onClick={() => onSelectAction(action)}>
      <ListItemIcon>{COEFFICIENT_ACTION_ICON[action]}</ListItemIcon>
      <ListItemText sx={COEFFICIENT_ACTION_TEXT_COLOR[action] ? { color: COEFFICIENT_ACTION_TEXT_COLOR[action] } : undefined}>
        {COEFFICIENT_ACTION_LABEL[action]}
      </ListItemText>
    </MenuItem>
  );

  return (
    <>
      {dateActions.map(renderItem)}
      {dateActions.length > 0 && lifecycleActions.length > 0 && <Divider />}
      {lifecycleActions.map(renderItem)}
    </>
  );
};
