---
name: conluz-web-list-tables
description: >-
  The conluz-web pattern for data tables and their row actions: ListTable + RowActionsMenu, the
  kebab-only rule, menu state, destructive items, and the confirmation dialog every state-changing
  action needs. Use whenever building or changing a list table, a row menu or a row action dialog.
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

The page keeps what differs: the `Paper` shell, the error `Alert`, `ResultStatus`, the narrow-viewport `RecordList`, pagination (`UsersPage`), the menu items, and the menu state (`anchorEl` + the selected row). Destructive items (delete) go last, below a `<Divider>`, with `color: "error.main"`.

**For actions that change server state** (role change, status toggle, etc.) the menu item must open a confirmation `<Dialog>` that:
- Names the affected entity.
- Shows the new value via a controlled select or clear text.
- Includes an `<Alert severity="info">` explaining consequences.
- Disables the confirm button while the mutation is pending or when the new value equals the current value.

**Never** show a `<Select>` or any mutable control directly inside a table row — it bypasses the confirmation step and is visually inconsistent.

