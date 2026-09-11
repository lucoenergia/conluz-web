import type { FC, ReactNode } from "react";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { colors } from "../../theme/tokens";
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

export interface CoefficientActionsMenuItem {
  action: CoefficientAction;
  /**
   * Present (non-empty) marks the item unavailable and renders this text as
   * a secondary line — never via MUI's `disabled` prop, which would make the
   * item unfocusable and drop it from arrow-key navigation. Absent (the row
   * menu's case: an action a single coefficient doesn't support is simply
   * never listed) means the item is fully enabled.
   */
  disabledReason?: string;
}

export interface CoefficientActionsMenuItemsProps {
  /** Already in canonical order (see ACTION_ORDER in sharingAgreementCoefficientState.ts) — this component groups, it doesn't sort. */
  items: readonly CoefficientActionsMenuItem[];
  onSelectAction: (action: CoefficientAction) => void;
}

/**
 * Renders the MenuItems (and grouping divider) for a coefficient action
 * menu's children — the caller owns the surrounding `<Menu>`. Shared between
 * the row's `⋯` menu (every item always enabled) and the batch bar's
 * `Acciones` menu (an item can be present but only partially available
 * across the selection, rendered disabled-but-reachable with its reason).
 *
 * The caller's `<Menu>` must set `slotProps={{ list: { disabledItemsFocusable: true } }}`
 * — without it, arrow keys skip `aria-disabled` items entirely, not just
 * `disabled` ones.
 */
export const CoefficientActionsMenuItems: FC<CoefficientActionsMenuItemsProps> = ({ items, onSelectAction }) => {
  const dateItems = items.filter((item) => DATE_ACTIONS.has(item.action));
  const lifecycleItems = items.filter((item) => !DATE_ACTIONS.has(item.action));

  const renderItem = (item: CoefficientActionsMenuItem) => {
    const isDisabled = !!item.disabledReason;
    return (
      <MenuItem
        key={item.action}
        onClick={() => {
          if (!isDisabled) onSelectAction(item.action);
        }}
        aria-disabled={isDisabled || undefined}
      >
        <ListItemIcon>{COEFFICIENT_ACTION_ICON[item.action]}</ListItemIcon>
        <ListItemText
          sx={COEFFICIENT_ACTION_TEXT_COLOR[item.action] && !isDisabled ? { color: COEFFICIENT_ACTION_TEXT_COLOR[item.action] } : undefined}
          secondary={item.disabledReason}
          slotProps={{ secondary: { sx: { color: colors.text.subtle } } }}
        >
          {COEFFICIENT_ACTION_LABEL[item.action]}
        </ListItemText>
      </MenuItem>
    );
  };

  return (
    <>
      {dateItems.map(renderItem)}
      {dateItems.length > 0 && lifecycleItems.length > 0 && <Divider />}
      {lifecycleItems.map(renderItem)}
    </>
  );
};
