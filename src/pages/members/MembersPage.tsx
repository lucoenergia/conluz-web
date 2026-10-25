import { useState, type FC } from "react";
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
import { SendPendingInvitationsDialog } from "./SendPendingInvitationsDialog";
import { InvitationActionDialog, type InvitationWriteKind } from "./InvitationActionDialog";
import {
  invitationActionsFor,
  invitationText,
  statusOf,
  statusToggleFor,
  type InvitationActions,
} from "./membershipStatus";
import { MembershipStatusCell, MembershipStatusChip } from "./MembershipStatusCell";
import { Notice } from "../../components/Notice";

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
              rowActionsLabel={(membership) => `Más acciones para ${membership.fullName}`}
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
                        {membership.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {membership.fullName}
                        </Typography>
                        {membership.contactEmail && (
                          <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                            {membership.contactEmail}
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
                  render: (membership) => <MembershipStatusCell membership={membership} />,
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
                        {membership.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                    ),
                    title: membership.fullName,
                    status: <MembershipStatusChip membership={membership} />,
                    actions: hasRowActions(membership) ? (
                      <IconButton
                        aria-label={`Más acciones para ${membership.fullName}`}
                        onClick={(e) => handleMenuOpen(e, membership)}
                        sx={sxStyles.touchTarget}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    ) : undefined,
                    fields: [
                      { label: "Email", value: membership.contactEmail ?? "-" },
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
      {/* The import refreshes the roster itself. Its result hands over to the
          bulk send, when the community grants it, rather than sending anything. */}
      {importDialogOpen && membershipActions.importMembers && (
        <ImportMembersDialog
          communityName={communityName}
          importMembers={membershipActions.importMembers}
          onSendPending={
            membershipActions.sendPendingInvitations
              ? () => {
                  setImportDialogOpen(false);
                  setBulkDialogOpen(true);
                }
              : undefined
          }
          onClose={() => setImportDialogOpen(false)}
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
            <strong>{selectedMembership?.fullName ?? "este miembro"}</strong> en {community}?
          </Typography>
          <Notice severity="info">
            {selectedStatusToggle?.isSuspending
              ? `Mientras esté suspendido, no podrá acceder a ${community}. Su cuenta y su acceso a otras comunidades no cambian.`
              : `Volverá a tener acceso a ${community}.`}
          </Notice>
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
          <Button onClick={() => setRoleDialogOpen(false)}>Cancelar</Button>
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
            <strong>{removeTarget?.fullName ?? "este miembro"}</strong> de {community}?
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
