---
name: conluz-web-list-tables
description: >-
  The conluz-web pattern for data tables and their row actions: ListTable + RowActionsMenu, the
  kebab-only rule, menu state, destructive items, row selection, and the confirmation dialog every
  state-changing action needs. Use whenever building or changing a list table, a row menu, a row
  selection or a row action dialog.
---

# conluz-web — List tables and row actions

**All records lists must use a three-dot kebab menu for row actions.** Never place action buttons or interactive controls (selects, toggles) inline in table rows.

A records list is a `ResponsiveRecordList` (`src/components/ResponsiveRecordList`) holding two layouts the page builds: a `ListTable` and a `RecordList`. **The page draws no list `Paper` and no layout switch of its own**: the wrapper owns the panel and shows exactly one layout, the table from a 1024px viewport (`LIST_TABLE_MIN_WIDTH`, read by `useListLayout()`) and the stacked list below it (UI-LST-001). `MIN_DESKTOP_WIDTH` (768px) is the side menu's breakpoint only. The wrapper's other slots:

- `header`: inside the panel, above the rows: filters, counts, the `ResultStatus` live region, the selection bar.
- `footer`: below a hairline: `ListPagination`, which renders nothing up to 25 rows and pages by 25 above that (UI-LST-005). Keep the page with `useListPage(rows)`.
- `empty`: an `EmptyState`, passed **only** when the list has loaded with no rows. It replaces both layouts; neither component has an empty message.
- `error`: `{ message, onRetry }` for a failed read: "No se pudieron cargar los …" and the query's `refetch`. It replaces everything in the panel, so a failed read never shows as empty (UI-LST-004).

Each layout draws its own loading state as skeleton rows (`isLoading`, `loadingRows`).

Both layouts take the same row actions, `rowActions={{ label, onClick, has }}` (`RowActions<T>`): `label(row)` names the kebab, `onClick(event, row)` opens the page's `RowActionsMenu` anchored at `event.currentTarget`, and `has(row)` is false for a row whose capabilities leave nothing in its menu, which then gets no kebab. `ListTable` draws its trailing actions column **only while some row on screen has actions** (and reserves it while loading); its "Acciones" header is visually hidden but named, and a row without actions keeps an empty cell (UI-LST-003). There is **no row hover**, and the row is never a link or a click target: only `ListTable`'s `title` column (the record's name) or a `RecordListItem`'s title may link, through `title.href(row)` / `item.href`, and only where a detail route exists (UI-LST-002). The table's layout is fixed and never scrolls sideways: give columns a `width` (a CSS length or a percentage, padding included), and move a value that does not fit under the name with `title.secondary(row)`.

Real usage, from `src/pages/communities/CommunitiesPage.tsx`:

```tsx
const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null); // the id, not the row
const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, community: CommunityResponse) => { /* set both */ };
const handleMenuClose = () => setAnchorEl(null);
const { page, setPage, pageCount, pageRows } = useListPage(communities);

<ResponsiveRecordList
  error={error ? { message: "No se pudieron cargar las comunidades.", onRetry: () => void refetch() } : undefined}
  header={<ResultStatus isLoading={isLoading} count={communities.length} noun={…} emptyMessage="…" />}
  empty={!isLoading && communities.length === 0 ? <EmptyState icon={BusinessIcon} title="No hay comunidades registradas" /> : undefined}
  wide={
    <ListTable
      rows={pageRows}
      getRowKey={(community) => community.id}
      isLoading={isLoading}
      rowActions={{ label: (c) => `Más acciones para ${c.name}`, onClick: handleMenuOpen, has: hasRowActions }}
      title={{ header: "Nombre", text: (c) => c.name, leading: () => <BusinessIcon />, secondary: (c) => [c.code, …] }}
      columns={[{ key: "status", header: "Estado", width: "104px", render: (c) => <Chip … /> }]}
      // header: a string gets the standard header style; a node (icon + ListTableHeaderText) renders as is
    />
  }
  narrow={<RecordList label="Comunidades" isLoading={isLoading} rowActions={…} items={pageRows.map(…)} />}
  footer={!isLoading && <ListPagination page={page} pageCount={pageCount} total={communities.length} noun={…} onChange={setPage} />}
/>

<RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
  <MenuItem onClick={handleEditClick}>…</MenuItem>
  <Divider />
  <MenuItem onClick={…}><ListItemText sx={{ color: "error.main" }}>Eliminar</ListItemText></MenuItem>
</RowActionsMenu>
```

`RecordList`'s `rowActions` receive the `RecordListItem`; map it back to the page's row by id. The page keeps what differs: the menu items, the menu state (`anchorEl` + the selected row's id), and the two mappings. Destructive items (delete) go last, below a `<Divider>`, with `color: "error.main"`.

**For actions that change server state** (role change, status toggle, etc.) the menu item must open a confirmation `<Dialog>` that:
- Names the affected entity.
- Shows the new value via a controlled select or clear text.
- Includes a `<Notice severity="info">` explaining consequences (a note, not an `Alert`, which would be announced as urgent).
- Disables the confirm button while the mutation is pending or when the new value equals the current value.
- Cannot be dismissed while the mutation is pending: pass `inFlightDialogProps(isPending, onClose)` to the `<Dialog>` and `disabled={isPending}` to "Cancelar" (`inFlight` on a `ConfirmationModal`).

**Never** show a `<Select>` or any mutable control directly inside a table row — it bypasses the confirmation step and is visually inconsistent.

## Selecting rows to act on together

A **selection checkbox in the leading slot is the one inline control a row may carry.** It changes no server state by itself: it only marks the row for an action that lives outside the rows and confirms before it writes. Use the components' own slot, never a hand-built column:

- `ListTable`'s `selection={{ header, render }}` renders a leading `padding="checkbox"` column; `RecordListItem.selection` renders a fixed-width leading slot, given to every row as soon as one has a selection, so the rows stay aligned. The page supplies the checkboxes, so the components hold no selection policy.
- Each row checkbox is named **"Seleccionar <nombre>"** (`inputProps={{ "aria-label": … }}`). A row that cannot be selected renders nothing in the slot (`null`), not a disabled checkbox — unless the reason is the selection limit, which disables the unselected rows while it is reached.
- **"Seleccionar todo" is tri-state**: unchecked or indeterminate selects the rows shown, checked deselects them. It is the table header's control in the wide layout; the stacked list has no header, so it is a labelled checkbox above the list, in the wrapper's `header` (pick it with `useListLayout()`).
- **The actions on the selection live outside the rows**, in a bar above the list that shows the count, mounted only while something is selected, and open the same confirmation dialog any state-changing action does.
- Keep the selection with `useRowSelection` (`src/hooks/useRowSelection.ts`): it stores ids, not rows, drops any id that stops being selectable when the list is refreshed, and caps the selection at a limit, saying when "select all" stopped there. Which rows are selectable comes from each row's capability and state, never from a role.

Real usage: the members page's selection of whom to invite or resend (`src/pages/members/MembersPage.tsx`, #328). The sharing agreement coefficient set (`src/components/SharingAgreementCoefficientSet`) keeps its selection with `useRowSelection` too, but renders its own table and cards: its editing mode puts inputs in the rows, which `ListTable` and `RecordList` do not allow.

