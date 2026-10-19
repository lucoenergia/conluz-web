import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  Avatar,
  MenuItem,
  Select,
  Stack,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SendIcon from "@mui/icons-material/Send";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { radii, shadows, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { RecordList } from "../../components/RecordList";
import { ListTable, RowActionsMenu } from "../../components/ListTable";
import { ResultStatus } from "../../components/ResultStatus";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import { useActiveCommunity } from "../../context/community.context";
import { useGetMemberships } from "../../api/memberships/memberships";
import { type MembershipResponse, MembershipResponseRole, UpdateMembershipRoleBodyRole } from "../../api/models";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import {
  useCommunityActions,
  useMembershipActions,
  type Action,
  type MembershipRowActions,
} from "../../hooks/actions";
import { Can, outcomeFromResource } from "../../hooks/permissions";
import { useErrorDispatch } from "../../context/error.context";
import { ImportPartnersModal } from "../../components/Modals/ImportPartnersModal";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";
import { invitationRefusalMessage, removalRefusalMessage } from "../../errors/membershipErrors";
import { MemberRecordDialog } from "./MemberRecordDialog";
import { RegisterMemberDialog } from "./RegisterMemberDialog";
import { SendPendingInvitationsDialog } from "./SendPendingInvitationsDialog";
import { InvitationActionDialog, type InvitationWriteKind } from "./InvitationActionDialog";
import {
  invitationActionsFor,
  invitationStateOf,
  statusOf,
  type InvitationActions,
  type MembershipStatus,
} from "./membershipStatus";

const ROLE_LABELS: Record<string, string> = {
  [MembershipResponseRole.COMMUNITY_MEMBER]: "Miembro",
  [MembershipResponseRole.COMMUNITY_ADMIN]: "Administrador",
};

type StatusToggle = { action: Action<[], boolean>; isSuspending: boolean } | undefined;

/**
 * Suspend or reactivate, never both. A caller who may do either is granted
 * both canEnable and canDisable, so the membership's own `enabled` picks the
 * one that applies -- resolved once, so the menu item, its confirmation and
 * the handler cannot disagree about which was chosen.
 */
function statusToggleFor(
  membership: MembershipResponse | null | undefined,
  actions: MembershipRowActions["actions"],
): StatusToggle {
  if (!membership) return undefined;
  if (membership.enabled) return actions.disable && { action: actions.disable, isSuspending: true };
  return actions.enable && { action: actions.enable, isSuspending: false };
}

const STATUS_CHIPS: Record<MembershipStatus, { label: string; color: "success" | "warning" | "error" }> = {
  active: { label: "Activo", color: "success" },
  pending: { label: "Pendiente", color: "warning" },
  suspended: { label: "Suspendido", color: "error" },
};

const MembershipStatusChip: FC<{ membership: MembershipResponse }> = ({ membership }) => {
  const { label, color } = STATUS_CHIPS[statusOf(membership)];
  return <Chip label={label} color={color} size="small" sx={{ fontWeight: 600 }} />;
};

/** Where a pending membership's invitation stands, or null once it is accepted (#275). */
function invitationText(membership: MembershipResponse): string | null {
  const state = invitationStateOf(membership);
  if (!state) return null;
  switch (state.kind) {
    case "never":
      return "Sin invitar";
    case "active":
      return `Enlace activo hasta el ${formatCalendarDate(state.expiresAt, SHORT_CALENDAR_DATE)}`;
    case "lapsed":
      return "Enlace caducado o revocado";
  }
}

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
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
  // The CSV import creates users, not memberships: POST /users/import is
  // guarded on canCreateUserIn, which the community reports as canCreateUsers.
  // It is a different answer from canManageMemberships even where the two
  // coincide today.
  const { importUsers } = useCommunityActions().forCommunity(activeCommunity).actions;

  // Resolved from the list on every render rather than stored, so the row the
  // menu and its dialogs act on is the one the cache currently holds.
  const selectedMembership = selectedMembershipId
    ? (memberships.find((m) => m.id === selectedMembershipId) ?? null)
    : null;
  const selectedActions = forMembership(selectedMembership ?? undefined).actions;
  const selectedStatusToggle = statusToggleFor(selectedMembership, selectedActions);
  const selectedInvitationActions = invitationActionsFor(selectedMembership, selectedActions);
  const selectedInvitationAction = invitationDialog ? selectedInvitationActions[invitationDialog] : undefined;

  // "Puntos de suministro" opens the member's own supply list, which is the
  // user's decision to make, not the membership's -- canListSupplies is
  // deliberately narrower than being able to read the user at all.
  const rowSupplies = (membership: MembershipResponse | null) =>
    outcomeFromResource(membership?.user?.capabilities, "canListSupplies");

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
    const remove = forMembership(memberships.find((m) => m.user?.id === userId)).actions.remove;
    if (!remove) return;
    const result = await remove.run();
    if ("ok" in result) {
      setRemoveConfirmUserId(null);
    } else {
      errorDispatch(removalRefusalMessage(result.error));
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, membership: MembershipResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedMembershipId(membership.id ?? null);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleChangeRoleClick = () => {
    handleMenuClose();
    setPendingRole(selectedMembership?.role ?? MembershipResponseRole.COMMUNITY_MEMBER);
    setRoleDialogOpen(true);
  };

  const handleRoleDialogConfirm = async () => {
    if (!selectedActions.changeRole) return;
    if (await selectedActions.changeRole.run({ role: pendingRole as UpdateMembershipRoleBodyRole })) {
      setRoleDialogOpen(false);
    } else {
      errorDispatch("Error al actualizar el rol. Por favor, inténtalo de nuevo.");
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

  // Active means accepted and enabled: a pending member has no access yet.
  const activeCount = memberships.filter((m) => statusOf(m) === "active").length;
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
            {importUsers && (
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setShowImportModal(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Importar miembros
              </Button>
            )}
            {membershipActions.sendPendingInvitations && (
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                onClick={() => setBulkDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Enviar invitaciones pendientes
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
            <ResultStatus
              isLoading={isLoading}
              count={memberships.length}
              noun={{ one: "miembro", other: "miembros" }}
              emptyMessage="No se encontraron miembros"
            />

            {!isNarrow && (
            <ListTable
              rows={memberships}
              getRowKey={(membership) => membership.id}
              isLoading={isLoading}
              emptyMessage="No hay miembros en esta comunidad"
              rowActionsLabel={(membership) => `Más acciones para ${membership.user?.fullName ?? "el miembro"}`}
              onRowActionsClick={handleMenuOpen}
              hasRowActions={hasRowActions}
              columns={[
                {
                  key: "member",
                  header: "Miembro",
                  render: (membership) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: theme.palette.primary.main,
                          fontSize: fontSizes.md,
                        }}
                      >
                        {(membership.user?.fullName ?? "?").charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {membership.user?.fullName ?? "Miembro desconocido"}
                        </Typography>
                        {membership.user?.email && (
                          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                            {membership.user.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ),
                },
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
                  render: (membership) => {
                    const invitation = invitationText(membership);
                    return (
                      <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                        <MembershipStatusChip membership={membership} />
                        {invitation && (
                          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                            {invitation}
                          </Typography>
                        )}
                      </Stack>
                    );
                  },
                },
              ]}
            />
            )}

            {isNarrow && (
            <Box sx={{ p: 2 }}>
              <RecordList
                label="Miembros de la comunidad"
                isLoading={isLoading}
                emptyMessage="No se encontraron miembros"
                items={memberships.map((membership) => {
                  const invitation = invitationText(membership);
                  return {
                    id: String(membership.id ?? ""),
                    avatar: (
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                        {(membership.user?.fullName ?? "?").charAt(0).toUpperCase()}
                      </Avatar>
                    ),
                    title: membership.user?.fullName ?? "Miembro desconocido",
                    status: <MembershipStatusChip membership={membership} />,
                    actions: hasRowActions(membership) ? (
                      <IconButton
                        aria-label={`Más acciones para ${membership.user?.fullName ?? "el miembro"}`}
                        onClick={(e) => handleMenuOpen(e, membership)}
                        sx={sxStyles.touchTarget}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    ) : undefined,
                    fields: [
                      { label: "Email", value: membership.user?.email ?? "-" },
                      { label: "Rol", value: ROLE_LABELS[membership.role ?? MembershipResponseRole.COMMUNITY_MEMBER] },
                      ...(invitation ? [{ label: "Invitación", value: invitation }] : []),
                    ],
                  };
                })}
              />
            </Box>
            )}
            </>
          )}
        </Paper>
      </Box>

      {/* Mounted with its button: no import action, nothing that can open it.
          The action invalidates the roster itself, so there is nothing left for
          the page to do when it completes. */}
      {importUsers && (
        <ImportPartnersModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          importUsers={importUsers}
        />
      )}

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
            onClick={() => {
              handleMenuClose();
              setRemoveConfirmUserId(selectedMembership?.user?.id ?? null);
            }}
          >
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Eliminar</ListItemText>
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
          memberName={selectedMembership.user?.fullName ?? "este miembro"}
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
      {bulkDialogOpen && membershipActions.sendPendingInvitations && (
        <SendPendingInvitationsDialog
          communityName={communityName}
          sendPendingInvitations={membershipActions.sendPendingInvitations}
          onClose={() => setBulkDialogOpen(false)}
        />
      )}

      {/* Suspend / reactivate confirmation, gated like the item that opens it. */}
      <Dialog
        open={statusDialogOpen && !!selectedStatusToggle}
        onClose={() => setStatusDialogOpen(false)}
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
            <strong>{selectedMembership?.user?.fullName ?? "este miembro"}</strong> en {community}?
          </Typography>
          <Alert severity="info">
            {selectedStatusToggle?.isSuspending
              ? `Mientras esté suspendido, no podrá acceder a ${community}. Su cuenta y su acceso a otras comunidades no cambian.`
              : `Volverá a tener acceso a ${community}.`}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
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
        onClose={() => setRoleDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Cambiar rol en {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <Typography variant="body2">
            Cambiando el rol de <strong>{selectedMembership?.user?.fullName}</strong>.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Nuevo rol</InputLabel>
            <Select
              value={pendingRole}
              label="Nuevo rol"
              onChange={(e) => setPendingRole(e.target.value)}
            >
              <MenuItem value={MembershipResponseRole.COMMUNITY_MEMBER}>
                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_MEMBER]}
              </MenuItem>
              <MenuItem value={MembershipResponseRole.COMMUNITY_ADMIN}>
                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_ADMIN]}
              </MenuItem>
            </Select>
          </FormControl>
          <Alert severity="info">
            {pendingRole === MembershipResponseRole.COMMUNITY_ADMIN
              ? "Un administrador puede gestionar los miembros y la configuración de la comunidad."
              : "Un miembro tiene acceso básico a la comunidad y perderá los permisos de administración."}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleRoleDialogConfirm}
            disabled={pendingRole === selectedMembership?.role || selectedActions.changeRole?.isPending}
          >
            {selectedActions.changeRole?.isPending ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove confirmation dialog, gated like the item that opens it. */}
      <Dialog
        open={!!removeConfirmUserId && !!removeTargetRemove}
        onClose={() => setRemoveConfirmUserId(null)}
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
            <strong>{removeTarget?.user?.fullName ?? "este miembro"}</strong> de {community}?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemoveConfirmUserId(null)}>Cancelar</Button>
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
