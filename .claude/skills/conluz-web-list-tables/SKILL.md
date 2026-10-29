---
name: conluz-web-list-tables
description: >-
  The conluz-web pattern for data tables and their row actions: ListTable + RowActionsMenu, the
  kebab-only rule, menu state, destructive items, row selection, and the confirmation dialog every
  state-changing action needs. Use whenever building or changing a list table, a row menu, a row
  selection or a row action dialog.
---

# conluz-web — List tables and row actions

**All data tables must use a three-dot kebab menu for row actions.** Never place action buttons or interactive controls (selects, toggles) inline in table rows.

Build list tables with `ListTable` and `RowActionsMenu` from `src/components/ListTable`; do not copy a page's table markup. `ListTable` renders the header row, the loading and empty rows, row hover, and a trailing "Acciones" column whose kebab `IconButton` (`MoreVertIcon`, no visible label) calls `onRowActionsClick`. `RowActionsMenu` is the `<Menu>` that button opens, with the arrow styling and right anchoring. Real usage, from `src/pages/members/MembersPage.tsx`:

```tsx
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [selectedMembership, setSelectedMembership] = useState<MembershipResponse | null>(null);
const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipResponse) => { /* set both */ };
const handleMenuClose = () => setAnchorEl(null);

<ListTable
  rows={memberships}
  getRowKey={(membership) => membership.id}
  isLoading={isLoading}
  emptyMessage="No hay miembros en esta comunidad"
  rowActionsLabel={(membership) => `Más acciones para ${membership.user?.fullName ?? "el miembro"}`}
  onRowActionsClick={handleMenuOpen}
  columns={[
    { key: "role", header: "Rol", render: (membership) => <Typography variant="body2">{ROLE_LABELS[…]}</Typography> },
    // header: a string gets the standard header style; a node (TableSortLabel, icon + ListTableHeaderText) renders as is
  ]}
/>

<RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
  <MenuItem onClick={handleChangeRoleClick}>…</MenuItem>
  <Divider />
  <MenuItem onClick={…}><ListItemText sx={{ color: "error.main" }}>Eliminar</ListItemText></MenuItem>
</RowActionsMenu>
```

The page keeps what differs: the `Paper` shell, the error `Alert`, `ResultStatus`, the narrow-viewport `RecordList`, the menu items, and the menu state (`anchorEl` + the selected row). Destructive items (delete) go last, below a `<Divider>`, with `color: "error.main"`.

**For actions that change server state** (role change, status toggle, etc.) the menu item must open a confirmation `<Dialog>` that:
- Names the affected entity.
- Shows the new value via a controlled select or clear text.
- Includes a `<Notice severity="info">` explaining consequences (a note, not an `Alert`, which would be announced as urgent).
- Disables the confirm button while the mutation is pending or when the new value equals the current value.
- Cannot be dismissed while the mutation is pending: pass `inFlightDialogProps(isPending, onClose)` to the `<Dialog>` and `disabled={isPending}` to "Cancelar" (`inFlight` on a `ConfirmationModal`).

**Never** show a `<Select>` or any mutable control directly inside a table row — it bypasses the confirmation step and is visually inconsistent.

## Selecting rows to act on together

A **selection checkbox in the leading slot is the one inline control a row may carry.** It changes no server state by itself: it only marks the row for an action that lives outside the rows and confirms before it writes. Use the components' own slot, never a hand-built column:

- `ListTable`'s `selection={{ header, render }}` renders a leading `padding="checkbox"` column; `RecordListItem.selection` renders a fixed-width leading slot, given to every card as soon as one has a selection, so the cards stay aligned. The page supplies the checkboxes, so the components hold no selection policy.
- Each row checkbox is named **"Seleccionar <nombre>"** (`inputProps={{ "aria-label": … }}`). A row that cannot be selected renders nothing in the slot (`null`), not a disabled checkbox — unless the reason is the selection limit, which disables the unselected rows while it is reached.
- **"Seleccionar todo" is tri-state**: unchecked or indeterminate selects the rows shown, checked deselects them. It is the table header's control on wide screens; the card list has no header, so it is a labelled checkbox above the list.
- **The actions on the selection live outside the rows**, in a bar above the list that shows the count, mounted only while something is selected, and open the same confirmation dialog any state-changing action does.
- Keep the selection with `useRowSelection` (`src/hooks/useRowSelection.ts`): it stores ids, not rows, drops any id that stops being selectable when the list is refreshed, and caps the selection at a limit, saying when "select all" stopped there. Which rows are selectable comes from each row's capability and state, never from a role.

Real usage: the members page's selection of whom to invite or resend (`src/pages/members/MembersPage.tsx`, #328). The sharing agreement coefficient set predates these slots and keeps its own selection code.

