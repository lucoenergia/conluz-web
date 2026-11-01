import { useMemo, useRef, useState, type FC } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Button,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SendIcon from "@mui/icons-material/Send";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { radii, shadows, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { RecordList, type RecordListItem } from "../../components/RecordList";
import { ListTable, RowActionsMenu } from "../../components/ListTable";
import { EmptyState } from "../../components/EmptyState";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import { useActiveCommunity } from "../../context/community.context";
import { useGetMemberships } from "../../api/memberships/memberships";
import { type MembershipResponse, MembershipResponseRole, UpdateMembershipRoleBodyRole } from "../../api/models";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useMembershipActions } from "../../hooks/actions";
import { Can, outcomeFromResource } from "../../hooks/permissions";
import { useErrorDispatch } from "../../context/error.context";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import {
  invitationRefusalMessage,
  removalRefusalMessage,
  roleChangeRefusalMessage,
} from "../../errors/membershipErrors";
import { LAST_ACTIVE_ADMIN_EXPLANATION } from "../../errors/membershipErrorMessages";
import { MemberRecordDialog } from "./MemberRecordDialog";
import { ImportMembersDialog } from "./ImportMembersDialog";
import { RegisterMemberDialog } from "./RegisterMemberDialog";
import { SendInvitationsDialog, type InvitationRecipient } from "./SendInvitationsDialog";
import { InvitationActionDialog, type InvitationWriteKind } from "./InvitationActionDialog";
import {
  invitationActionsFor,
  invitationSelectionEmptyReason,
  isSelectableForInvitation,
  lacksContactEmailToInvite,
  membershipStatusOf,
  statusToggleFor,
  type InvitationActions,
} from "./membershipStatus";
import { MembershipStatusChip } from "./MembershipStatusChip";
import {
  filterMemberships,
  MEMBERS_PAGE_SIZE,
  membersCount,
  NO_MEMBER_FILTERS,
  pageCountOf,
  pageOf,
  type MemberFilters,
} from "./memberFilters";
import { MembersFilters } from "./MembersFilters";
import { MembersPagination } from "./MembersPagination";
import { Notice } from "../../components/Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";
import { useRowSelection } from "../../hooks/useRowSelection";
import { pluralize } from "../../utils/pluralize";

const ROLE_LABELS: Record<string, string> = {
  [MembershipResponseRole.COMMUNITY_MEMBER]: "Miembro",
  [MembershipResponseRole.COMMUNITY_ADMIN]: "Administrador",
};

/**
 * Whether the backend would refuse demoting or removing this membership as the
 * community's last active admin (lucoenergia/conluz#449). That is the row's
 * state, apart from the capabilities, which only say the caller may ask. An
 * older backend leaves the field out, which counts as false.
 */
const isLastActiveAdmin = (membership: MembershipResponse | null | undefined) =>
  membership?.lastActiveAdmin === true;

/** The most people one send or resend may select: the backend's limit (lucoenergia/conluz#527). */
const MAX_INVITATION_SELECTION = 50;

const INVITATION_ITEMS: { kind: InvitationWriteKind; key: keyof InvitationActions; label: string }[] = [
  { kind: "invite", key: "invite", label: "Invitar" },
  { kind: "resend", key: "resend", label: "Reenviar" },
  { kind: "revoke", key: "revoke", label: "Revocar enlace" },
];

export const MembersPage: FC = () => {
  const { width } = useWindowDimensions();
  // Render ONE layout, not two hidden copies: a stacked list below the
  // project's desktop breakpoint, the table above it.
  const isNarrow = width < MIN_DESKTOP_WIDTH;
  const theme = useTheme();
  const navigate = useNavigate();
  const activeCommunityId = useActiveCommunity();
  const activeCommunity = useActiveCommunityResource();
  const communityName = useActiveCommunityName();
  const community = communityLabel(communityName);
  const errorDispatch = useErrorDispatch();

  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  // The selection as it stood when the send was opened, so the confirmation
  // and its result keep naming the same people while the roster refreshes.
  const [invitationRecipients, setInvitationRecipients] = useState<InvitationRecipient[] | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The id, not the row. A write invalidates the list, so a stored row would go
  // on answering from before the change -- and it is that row's capabilities
  // that now decide what its menu offers.
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [invitationDialog, setInvitationDialog] = useState<InvitationWriteKind | null>(null);
  // The search, the filters and the page are this view's alone: never stored,
  // never sent, and lost on leaving the page (#331).
  const [filters, setFilters] = useState<MemberFilters>(NO_MEMBER_FILTERS);
  const [page, setPage] = useState(1);
  const countRef = useRef<HTMLElement>(null);

  const {
    data: memberships = [],
    isLoading,
    error,
  } = useGetMemberships(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });

  // What this caller may do, as the backend answers it. forMembership is a
  // plain function rather than a hook precisely so it can be asked once per row.
  const { actions: membershipActions, forMembership } = useMembershipActions(activeCommunity);

  // Resolved from the list on every render rather than stored, so the row the
  // menu and its dialogs act on is the one the cache currently holds.
  const selectedMembership = selectedMembershipId
    ? (memberships.find((m) => m.id === selectedMembershipId) ?? null)
    : null;
  const selectedActions = forMembership(selectedMembership ?? undefined).actions;
  const selectedStatusToggle = statusToggleFor(selectedMembership, selectedActions);
  const selectedInvitationActions = invitationActionsFor(selectedMembership, selectedActions);
  const selectedInvitationAction = invitationDialog ? selectedInvitationActions[invitationDialog] : undefined;

  // "Puntos de suministro" opens the member's own supply list. canListSupplies
  // is deliberately narrower than managing the membership: the membership
  // reports it because its user is a reference by id (lucoenergia/conluz#448).
  const rowSupplies = (membership: MembershipResponse | null) =>
    outcomeFromResource(membership?.capabilities, "canListSupplies");

  // No permitted action means no menu at all, rather than a menu with nothing
  // in it or items the backend would refuse.
  const hasRowActions = (membership: MembershipResponse) => {
    const actions = forMembership(membership).actions;
    return (
      !!actions.editRecord ||
      !!statusToggleFor(membership, actions) ||
      Object.values(invitationActionsFor(membership, actions)).some(Boolean) ||
      !!actions.changeRole ||
      !!actions.remove ||
      rowSupplies(membership).state === "allowed"
    );
  };

  const handleRemoveMember = async (userId: string) => {
    const target = memberships.find((m) => m.user?.id === userId);
    const remove = forMembership(target).actions.remove;
    if (!remove) return;
    const result = await remove.run();
    if ("ok" in result) {
      setRemoveConfirmUserId(null);
    } else {
      // The removed row's role, not the caller's: it only picks the wording of
      // the supplies refusal, since a peer cannot suspend an admin (lucoenergia/conluz#449, MEM-034).
      const subject = target?.role === MembershipResponseRole.COMMUNITY_ADMIN ? "admin" : "member";
      errorDispatch(removalRefusalMessage(result.error, subject));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedMembershipId(membership.id ?? null);
  };

  const handleMenuClose = () => setAnchorEl(null);

  // The narrow list's item back to the membership it was built from.
  const membershipOfItem = (item: RecordListItem) => memberships.find((m) => String(m.id ?? "") === item.id);

  const handleChangeRoleClick = () => {
    handleMenuClose();
    setPendingRole(selectedMembership?.role ?? MembershipResponseRole.COMMUNITY_MEMBER);
    setRoleDialogOpen(true);
  };

  const handleRoleDialogConfirm = async () => {
    if (!selectedActions.changeRole) return;
    const result = await selectedActions.changeRole.run({ role: pendingRole as UpdateMembershipRoleBodyRole });
    if ("ok" in result) {
      setRoleDialogOpen(false);
    } else {
      errorDispatch(roleChangeRefusalMessage(result.error));
    }
  };

  const handleStatusConfirm = async () => {
    if (!selectedStatusToggle) return;
    const { action, isSuspending } = selectedStatusToggle;
    if (await action.run()) {
      setStatusDialogOpen(false);
    } else {
      errorDispatch(
        isSuspending
          ? "No se ha podido suspender al miembro. Inténtalo de nuevo."
          : "No se ha podido reactivar al miembro. Inténtalo de nuevo.",
      );
    }
  };

  // Narrowing the list always starts it again from its first page.
  const changeFilters = (changes: Partial<MemberFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(1);
  };
  const clearFilters = () => changeFilters(NO_MEMBER_FILTERS);

  // Derived from the roster on every render, never copied: a refetch after a
  // write shows through at once, filtered as before.
  const filtered = useMemo(() => filterMemberships(memberships, filters), [memberships, filters]);
  const pageCount = pageCountOf(filtered.length);
  // A write can shrink the result under the page shown, so it is clamped.
  const currentPage = Math.min(page, pageCount);
  const pageRows = pageOf(filtered, currentPage);
  const changePage = (next: number) => {
    setPage(next);
    countRef.current?.scrollIntoView?.({ block: "start" });
  };
  // The send or resend to selected members (#328). Only the rows the backend
  // would not refuse for a reason the roster shows can be selected, and only
  // when the community hands over the send; the backend decides each person
  // again. The selection is kept by user id across pages and filters, and
  // "select all" acts on every row the filters let through, not one page.
  const sendInvitations = membershipActions.sendInvitations;
  const canSendInvitations = !!sendInvitations;
  const selectableIds = useMemo(
    () =>
      canSendInvitations
        ? memberships.filter(isSelectableForInvitation).flatMap((m) => (m.user?.id ? [m.user.id] : []))
        : [],
    [memberships, canSendInvitations],
  );
  const filteredUserIds = useMemo(() => filtered.flatMap((m) => (m.user?.id ? [m.user.id] : [])), [filtered]);
  const selection = useRowSelection({ selectableIds, max: MAX_INVITATION_SELECTION });
  const selectionOffered = selectableIds.length > 0;
  const selectedCount = selection.selectedIds.length;
  const invitationEmptyReason =
    sendInvitations && !isLoading ? invitationSelectionEmptyReason(memberships) : null;

  const selectAllCheckbox = (
    <Checkbox
      checked={selection.allSelected(filteredUserIds)}
      indeterminate={selection.someSelected(filteredUserIds)}
      disabled={!filteredUserIds.some((id) => selectableIds.includes(id))}
      onChange={() => selection.toggleAll(filteredUserIds)}
      inputProps={{ "aria-label": "Seleccionar todo" }}
    />
  );

  // The row's checkbox, or nothing for a row that cannot be selected.
  const selectionCheckbox = (membership: MembershipResponse) => {
    const userId = membership.user?.id;
    if (!userId || !selectableIds.includes(userId)) return null;
    const isSelected = selection.isSelected(userId);
    return (
      <Checkbox
        checked={isSelected}
        disabled={!isSelected && selection.isAtLimit}
        onChange={() => selection.toggle(userId)}
        inputProps={{ "aria-label": `Seleccionar ${membership.fullName}` }}
      />
    );
  };

  // A row that would be selectable but has no contact email says so, since
  // no send to it can succeed.
  const showsNoContactEmail = (membership: MembershipResponse) =>
    selectionOffered && lacksContactEmailToInvite(membership);

  // First invitations, then resends, each in roster order: the order the
  // confirmation shows them in, and the order they are sent in.
  const openSendInvitations = () => {
    const selected = memberships.filter((m) => m.user?.id && selection.isSelected(m.user.id));
    const recipient = (m: MembershipResponse): InvitationRecipient => ({
      userId: m.user?.id ?? "",
      fullName: m.fullName,
      resend: m.invitedAt !== null,
    });
    setInvitationRecipients([
      ...selected.filter((m) => m.invitedAt === null).map(recipient),
      ...selected.filter((m) => m.invitedAt !== null).map(recipient),
    ]);
  };

  const isFiltering = filters.query.trim() !== "" || filters.status !== "all" || filters.role !== "all";
  // Some members, and none matching: an empty table would read as no members at all.
  const noResults = !isLoading && memberships.length > 0 && filtered.length === 0;

  // The counters describe the community, not the view: computed over the whole roster.
  // Active means accepted and enabled: a pending member has no access yet.
  const activeCount = memberships.filter((m) => membershipStatusOf(m).status === "active").length;
  const adminCount = memberships.filter((m) => m.role === MembershipResponseRole.COMMUNITY_ADMIN).length;

  const removeTarget = removeConfirmUserId
    ? memberships.find((m) => m.user?.id === removeConfirmUserId)
    : null;
  const removeTargetRemove = forMembership(removeTarget ?? undefined).actions.remove;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: colors.background.default,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <BreadCrumb
        steps={[
          { label: "Inicio", href: "/" },
          { label: "Miembros", href: "/members" },
        ]}
      />

      <DetailHeader
        variant="list"
        icon={<PeopleIcon />}
        title="Gestión de Miembros"
        subtitle="Administra los miembros de la comunidad activa"
        keyFacts={[
          { label: "Total", value: memberships.length },
          { label: "Activos", value: activeCount },
          { label: "Admins", value: adminCount },
        ]}
      />

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          {/* Each is mounted only when the backend hands over the action behind
              it -- never disabled, which would advertise something the caller
              cannot do. The action carries its own community, so there is no
              longer a "no community selected" case to disable for either. */}
          {/* Three actions do not fit one row at phone width: stacked there, in
              the order they read, and in a row from sm up. */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "flex-end",
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
            }}
          >
            {membershipActions.importMembers && (
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Importar miembros
              </Button>
            )}
            {membershipActions.register && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setRegisterDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Registrar miembro
              </Button>
            )}
          </Box>
        </Paper>
      </Box>

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: { xs: radii.default, sm: radii.large },
            bgcolor: "white",
            boxShadow: shadows.soft,
            overflow: "hidden",
            width: "100%",
          }}
        >
          {error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              Error al cargar los miembros. Por favor, inténtalo de nuevo.
            </Alert>
          ) : (
            <>
            <Box sx={{ p: 2, pb: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <MembersFilters
                filters={filters}
                onChange={changeFilters}
                onClear={clearFilters}
                resultCount={filtered.length}
                showClear={isFiltering && !noResults}
                isNarrow={isNarrow}
              />
              {/* One persistent live region: the count changes, the node stays. */}
              <Typography
                ref={countRef}
                role="status"
                aria-live="polite"
                variant="body2"
                sx={{ fontWeight: 600, color: "text.secondary", scrollMarginTop: (t) => t.spacing(2) }}
              >
                {isLoading ? "Cargando…" : membersCount(filtered.length)}
              </Typography>
              {invitationEmptyReason && <Notice severity="info">{invitationEmptyReason}</Notice>}
              {selectionOffered && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: { xs: 1, sm: 2 },
                  }}
                >
                  {/* The table head carries "select all" on wide screens; the
                      card list has no head, so it is labelled here. */}
                  {isNarrow && (
                    <FormControlLabel
                      control={selectAllCheckbox}
                      label="Seleccionar todo"
                      sx={{ m: 0 }}
                    />
                  )}
                  <Typography variant="body2" sx={{ color: "text.secondary", flex: 1 }}>
                    {selectedCount === 0
                      ? "Selecciona a quién enviar la invitación."
                      : `${selectedCount} ${pluralize(selectedCount, "seleccionado", "seleccionados")}`}
                  </Typography>
                  {selectedCount > 0 && (
                    <Button variant="contained" startIcon={<SendIcon />} onClick={openSendInvitations}>
                      Enviar invitación ({selectedCount})
                    </Button>
                  )}
                </Box>
              )}
              {selectionOffered && (selection.truncatedByLimit || selection.isAtLimit) && (
                <Notice severity="info">
                  {selection.truncatedByLimit
                    ? `Se han seleccionado los ${MAX_INVITATION_SELECTION} primeros: es el máximo por envío.`
                    : `Has llegado al máximo de ${MAX_INVITATION_SELECTION} por envío.`}
                </Notice>
              )}
            </Box>

            {noResults && (
              <Box sx={{ p: 2 }}>
                <EmptyState
                  icon={SearchOffIcon}
                  title="No hay miembros que coincidan"
                  subtitle="Prueba con otra búsqueda o quita algún filtro."
                  actionButton={{ label: "Limpiar filtros", onClick: clearFilters }}
                />
              </Box>
            )}

            {!isNarrow && !noResults && (
            <ListTable
              rows={pageRows}              getRowKey={(membership) => membership.id}
              isLoading={isLoading}
              emptyMessage="No hay miembros en esta comunidad"
              rowActions={{
                label: (membership) => `Más acciones para ${membership.fullName}`,
                onClick: handleMenuOpen,
                has: hasRowActions,
              }}
              selection={selectionOffered ? { header: selectAllCheckbox, render: selectionCheckbox } : undefined}
              title={{
                header: "Miembro",
                text: (membership) => membership.fullName,
                leading: (membership) => (
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: theme.palette.primary.main,
                      fontSize: fontSizes.md,
                    }}
                  >
                    {membership.fullName.charAt(0).toUpperCase()}
                  </Avatar>
                ),
                // The DNI/NIE/NIF as secondary information, after the email when
                // there is one; alone, with no separator, when there is none (UI-MBR-007).
                secondary: (membership) => [
                  <>
                    {membership.contactEmail && (
                      <>
                        <span>{membership.contactEmail}</span>
                        <span aria-hidden> · </span>
                      </>
                    )}
                    {showsNoContactEmail(membership) && (
                      <>
                        <span>Sin email de contacto</span>
                        <span aria-hidden> · </span>
                      </>
                    )}
                    <span>{membership.personalId}</span>
                  </>,
                ],
              }}
              columns={[
                {
                  key: "role",
                  header: "Rol",
                  render: (membership) => (
                    <Typography variant="body2">
                      {ROLE_LABELS[membership.role ?? MembershipResponseRole.COMMUNITY_MEMBER]}
                    </Typography>
                  ),
                },
                {
                  key: "status",
                  header: "Estado",
                  render: (membership) => <MembershipStatusChip membership={membership} />,
                },
              ]}
            />
            )}

            {isNarrow && !noResults && (
            <Box sx={{ p: 2 }}>
              <RecordList
                label="Miembros de la comunidad"
                isLoading={isLoading}
                emptyMessage="No se encontraron miembros"
                rowActions={{
                  label: (item) => `Más acciones para ${item.title}`,
                  onClick: (event, item) => {
                    const membership = membershipOfItem(item);
                    if (membership) handleMenuOpen(event, membership);
                  },
                  has: (item) => {
                    const membership = membershipOfItem(item);
                    return !!membership && hasRowActions(membership);
                  },
                }}
                items={pageRows.map((membership) => {
                  const role = ROLE_LABELS[membership.role ?? MembershipResponseRole.COMMUNITY_MEMBER];
                  return {
                    id: String(membership.id ?? ""),
                    selection: selectionOffered ? selectionCheckbox(membership) : undefined,
                    avatar: (
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                        {membership.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                    ),
                    title: membership.fullName,
                    badge: <MembershipStatusChip membership={membership} />,
                    // Role and DNI/NIE/NIF on one line, the email on its own, left out when there is none.
                    lines: [
                      `${role} · ${membership.personalId}`,
                      ...(membership.contactEmail ? [membership.contactEmail] : []),
                      ...(showsNoContactEmail(membership) ? ["Sin email de contacto"] : []),
                    ],
                    fields: [],
                  };
                })}
              />
            </Box>
            )}

            {!isLoading && filtered.length > MEMBERS_PAGE_SIZE && (
              <Box sx={{ p: 2, pt: 0 }}>
                <MembersPagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={filtered.length}
                  onChange={changePage}
                  isNarrow={isNarrow}
                />
              </Box>
            )}
            </>
          )}
        </Paper>
      </Box>


      {/* Every item is the selected row's own answer, including when that row is
          the caller's: the backend decides per membership, so there is no
          self-check here. */}
      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        {selectedActions.editRecord && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              setRecordDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText>Editar ficha</ListItemText>
          </MenuItem>
        )}
        {INVITATION_ITEMS.filter(({ key }) => selectedInvitationActions[key]).map(({ kind, label }) => (
          <MenuItem
            key={kind}
            onClick={() => {
              handleMenuClose();
              setInvitationDialog(kind);
            }}
          >
            <ListItemIcon>
              {kind === "invite" && <MailOutlineIcon fontSize="small" sx={{ color: "primary.main" }} />}
              {kind === "resend" && <SendIcon fontSize="small" sx={{ color: "primary.main" }} />}
              {kind === "revoke" && <LinkOffIcon fontSize="small" sx={{ color: "primary.main" }} />}
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}
        <Can outcome={rowSupplies(selectedMembership)}>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate(`/supply-points?personId=${selectedMembership?.user?.id}`);
            }}
          >
            <ListItemIcon>
              <ElectricBoltIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText>Puntos de suministro</ListItemText>
          </MenuItem>
        </Can>
        {selectedActions.changeRole && (
          <MenuItem onClick={handleChangeRoleClick}>
            <ListItemIcon>
              <ManageAccountsIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText>Cambiar rol</ListItemText>
          </MenuItem>
        )}
        {selectedStatusToggle && (
          <MenuItem
            onClick={() => {
              handleMenuClose();
              setStatusDialogOpen(true);
            }}
          >
            <ListItemIcon>
              {selectedStatusToggle.isSuspending ? (
                <BlockIcon fontSize="small" sx={{ color: "error.main" }} />
              ) : (
                <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
              )}
            </ListItemIcon>
            <ListItemText sx={{ color: selectedStatusToggle.isSuspending ? "error.main" : "success.main" }}>
              {selectedStatusToggle.isSuspending ? "Suspender" : "Reactivar"}
            </ListItemText>
          </MenuItem>
        )}
        {selectedActions.remove && [
          <Divider key="divider" />,
          <MenuItem
            key="remove"
            disabled={isLastActiveAdmin(selectedMembership)}
            onClick={() => {
              handleMenuClose();
              setRemoveConfirmUserId(selectedMembership?.user?.id ?? null);
            }}
          >
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText
              primary="Eliminar"
              secondary={isLastActiveAdmin(selectedMembership) ? LAST_ACTIVE_ADMIN_EXPLANATION : undefined}
              slotProps={{ primary: { sx: { color: "error.main" } }, secondary: { sx: { whiteSpace: "normal" } } }}
            />
          </MenuItem>,
        ]}
      </RowActionsMenu>

      {/* Mounted only while the row grants the edit, and seeded from it on open. */}
      {recordDialogOpen && selectedMembership && selectedActions.editRecord && (
        <MemberRecordDialog
          membership={selectedMembership}
          communityName={communityName}
          editRecord={selectedActions.editRecord}
          onClose={() => setRecordDialogOpen(false)}
        />
      )}

      {/* Mounted only while the row grants the write in its current state, so a
          refetch that changes the state closes it rather than leaving it open
          for a write that no longer applies. */}
      {invitationDialog && selectedMembership && selectedInvitationAction && (
        <InvitationActionDialog
          kind={invitationDialog}
          memberName={selectedMembership.fullName}
          communityName={communityName}
          action={selectedInvitationAction}
          onClose={() => setInvitationDialog(null)}
          onRefused={(refusal) => errorDispatch(invitationRefusalMessage(refusal, invitationDialog))}
        />
      )}

      {/* Mounted with the button that opens them, and on open, so each opening starts afresh. */}
      {registerDialogOpen && membershipActions.register && (
        <RegisterMemberDialog
          communityName={communityName}
          register={membershipActions.register}
          forMembership={forMembership}
          onClose={() => setRegisterDialogOpen(false)}
        />
      )}
      {/* The import refreshes the roster itself, and sends nothing: its result
          points to selecting the new members, when the community can invite. */}
      {importDialogOpen && membershipActions.importMembers && (
        <ImportMembersDialog
          communityName={communityName}
          importMembers={membershipActions.importMembers}
          invitable={canSendInvitations}
          onClose={() => setImportDialogOpen(false)}
        />
      )}
      {/* Mounted only while the community grants the send. The selection is
          cleared once the backend has answered for each person. */}
      {invitationRecipients && sendInvitations && (
        <SendInvitationsDialog
          communityName={communityName}
          recipients={invitationRecipients}
          sendInvitations={sendInvitations}
          onSent={selection.clear}
          onClose={() => setInvitationRecipients(null)}
        />
      )}

      {/* Suspend / reactivate confirmation, gated like the item that opens it. */}
      <Dialog
        open={statusDialogOpen && !!selectedStatusToggle}
        {...inFlightDialogProps(selectedStatusToggle?.action.isPending ?? false, () => setStatusDialogOpen(false))}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>
          {selectedStatusToggle?.isSuspending ? "Suspender miembro en" : "Reactivar miembro en"} {community}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2">
            {selectedStatusToggle?.isSuspending ? "¿Suspender a " : "¿Reactivar a "}
            <strong>{selectedMembership?.fullName ?? "este miembro"}</strong> en {community}?
          </Typography>
          <Notice severity="info">
            {selectedStatusToggle?.isSuspending
              ? `Mientras esté suspendido, no podrá acceder a ${community}. Su cuenta y su acceso a otras comunidades no cambian.`
              : `Volverá a tener acceso a ${community}.`}
          </Notice>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={selectedStatusToggle?.action.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={selectedStatusToggle?.isSuspending ? "error" : "primary"}
            onClick={handleStatusConfirm}
            disabled={selectedStatusToggle?.action.isPending}
          >
            {selectedStatusToggle?.isSuspending ? "Suspender" : "Reactivar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change role dialog */}
      {/* Mounted inside the same gate as the item that opens it: a confirmation
          dialog for an action the caller was never given has no way to be
          reached, and no way to be left open across a switch that revokes it. */}
      <Dialog
        open={roleDialogOpen && !!selectedActions.changeRole}
        {...inFlightDialogProps(selectedActions.changeRole?.isPending ?? false, () => setRoleDialogOpen(false))}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Cambiar rol en {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <Typography variant="body2">
            Cambiando el rol de <strong>{selectedMembership?.fullName}</strong>.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Nuevo rol</InputLabel>
            <Select
              value={pendingRole}
              label="Nuevo rol"
              onChange={(e) => setPendingRole(e.target.value)}
            >
              <MenuItem
                value={MembershipResponseRole.COMMUNITY_MEMBER}
                disabled={isLastActiveAdmin(selectedMembership)}
              >
                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_MEMBER]}
              </MenuItem>
              <MenuItem value={MembershipResponseRole.COMMUNITY_ADMIN}>
                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_ADMIN]}
              </MenuItem>
            </Select>
            {isLastActiveAdmin(selectedMembership) && (
              <FormHelperText>{LAST_ACTIVE_ADMIN_EXPLANATION}</FormHelperText>
            )}
          </FormControl>
          <Notice severity="info">
            {pendingRole === MembershipResponseRole.COMMUNITY_ADMIN
              ? "Un administrador puede gestionar los miembros y la configuración de la comunidad."
              : "Un miembro tiene acceso básico a la comunidad y perderá los permisos de administración."}
          </Notice>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRoleDialogOpen(false)} disabled={selectedActions.changeRole?.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleRoleDialogConfirm}
            disabled={
              pendingRole === selectedMembership?.role ||
              // A refetch can make the row the last active admin while Miembro is picked.
              (pendingRole === MembershipResponseRole.COMMUNITY_MEMBER && isLastActiveAdmin(selectedMembership)) ||
              selectedActions.changeRole?.isPending
            }
          >
            {selectedActions.changeRole?.isPending ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove confirmation dialog, gated like the item that opens it. */}
      <Dialog
        open={!!removeConfirmUserId && !!removeTargetRemove && !isLastActiveAdmin(removeTarget)}
        {...inFlightDialogProps(removeTargetRemove?.isPending ?? false, () => setRemoveConfirmUserId(null))}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Eliminar miembro de {community}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar a{" "}
            <strong>{removeTarget?.fullName ?? "este miembro"}</strong> de {community}?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemoveConfirmUserId(null)} disabled={removeTargetRemove?.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => removeConfirmUserId && handleRemoveMember(removeConfirmUserId)}
            disabled={removeTargetRemove?.isPending}
          >
            {removeTargetRemove?.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
