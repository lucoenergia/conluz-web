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
import { useGetAllUsers } from "../../api/users/users";
import {
  type MembershipResponse,
  CreateMembershipBodyRole,
  MembershipResponseRole,
  UpdateMembershipRoleBodyRole,
} from "../../api/models";
import { useActiveCommunityResource } from "../../hooks/useActiveCommunityResource";
import { useCommunityActions, useMembershipActions } from "../../hooks/actions";
import { Can, outcomeFromResource } from "../../hooks/permissions";
import { useErrorDispatch } from "../../context/error.context";
import { ImportPartnersModal } from "../../components/Modals/ImportPartnersModal";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import { communityLabel, useActiveCommunityName } from "../../hooks/useActiveCommunityName";

const ROLE_LABELS: Record<string, string> = {
  [MembershipResponseRole.COMMUNITY_MEMBER]: "Miembro",
  [MembershipResponseRole.COMMUNITY_ADMIN]: "Administrador",
};

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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(CreateMembershipBodyRole.COMMUNITY_MEMBER);
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The id, not the row. A write invalidates the list, so a stored row would go
  // on answering from before the change -- and it is that row's capabilities
  // that now decide what its menu offers.
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>("");

  const {
    data: memberships = [],
    isLoading,
    error,
  } = useGetMemberships(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });

  const { data: allUsersData } = useGetAllUsers({ size: 10000 });

  // What this caller may do, as the backend answers it. forMembership is a
  // plain function rather than a hook precisely so it can be asked once per row.
  const { actions: membershipActions, forMembership } = useMembershipActions(activeCommunity);
  // The CSV import creates users, not memberships: POST /users/import is
  // guarded on canCreateUserIn, which the community reports as canCreateUsers.
  // It is a different answer from canManageMemberships even where the two
  // coincide today.
  const { importUsers } = useCommunityActions().forCommunity(activeCommunity).actions;

  if (!activeCommunityId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Selecciona una comunidad activa para gestionar sus miembros.
        </Alert>
      </Box>
    );
  }

  // Resolved from the list on every render rather than stored, so the row the
  // menu and its dialogs act on is the one the cache currently holds.
  const selectedMembership = selectedMembershipId
    ? (memberships.find((m) => m.id === selectedMembershipId) ?? null)
    : null;
  const selectedActions = forMembership(selectedMembership ?? undefined).actions;

  // "Puntos de suministro" opens the member's own supply list, which is the
  // user's decision to make, not the membership's -- canListSupplies is
  // deliberately narrower than being able to read the user at all.
  const rowSupplies = (membership: MembershipResponse | null) =>
    outcomeFromResource(membership?.user?.capabilities, "canListSupplies");

  // No permitted action means no menu at all, rather than a menu with nothing
  // in it or items the backend would refuse.
  const hasRowActions = (membership: MembershipResponse) => {
    const { changeRole, remove } = forMembership(membership).actions;
    return !!changeRole || !!remove || rowSupplies(membership).state === "allowed";
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !membershipActions.add) return;
    if (await membershipActions.add.run({ userId: selectedUserId, role: selectedRole as CreateMembershipBodyRole })) {
      setAddDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole(CreateMembershipBodyRole.COMMUNITY_MEMBER);
    } else {
      errorDispatch("Error al añadir el miembro. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const remove = forMembership(memberships.find((m) => m.user?.id === userId)).actions.remove;
    if (!remove) return;
    if (await remove.run()) {
      setRemoveConfirmUserId(null);
    } else {
      errorDispatch("Error al eliminar el miembro. Por favor, inténtalo de nuevo.");
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

  const existingUserIds = new Set(memberships.map((m) => m.user?.id).filter(Boolean));
  const availableUsers = allUsersData?.items?.filter((u) => u.id && !existingUserIds.has(u.id)) ?? [];

  const activeCount = memberships.filter((m) => m.enabled).length;
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
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
            {membershipActions.add && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setAddDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Añadir miembro
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
              Error al cargar los miembros. Por favor, intente de nuevo.
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
                        <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                          {membership.user?.email ?? ""}
                        </Typography>
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
                  render: (membership) => (
                    <Chip
                      label={membership.enabled ? "Activo" : "Inactivo"}
                      color={membership.enabled ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ),
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
                items={memberships.map((membership) => ({
                  id: String(membership.id ?? ""),
                  avatar: (
                    <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                      {(membership.user?.fullName ?? "?").charAt(0).toUpperCase()}
                    </Avatar>
                  ),
                  title: membership.user?.fullName ?? "Miembro desconocido",
                  status: (
                    <Chip
                      label={membership.enabled ? "Activo" : "Inactivo"}
                      color={membership.enabled ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ),
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
                  ],
                }))}
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

      {/* Add member dialog */}
      <Dialog
        open={addDialogOpen && !!membershipActions.add}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ px: 3, pt: 2.5 }}>
          <CommunityScopeHeader name={communityName} />
        </Box>
        <DialogTitle sx={{ pt: 0 }}>Añadir miembro a {community}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Miembro</InputLabel>
            <Select
              value={selectedUserId}
              label="Miembro"
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {availableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select
              value={selectedRole}
              label="Rol"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <MenuItem value={CreateMembershipBodyRole.COMMUNITY_MEMBER}>
                {ROLE_LABELS[CreateMembershipBodyRole.COMMUNITY_MEMBER]}
              </MenuItem>
              <MenuItem value={CreateMembershipBodyRole.COMMUNITY_ADMIN}>
                {ROLE_LABELS[CreateMembershipBodyRole.COMMUNITY_ADMIN]}
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAddMember}
            disabled={!selectedUserId || membershipActions.add?.isPending}
          >
            {membershipActions.add?.isPending ? "Añadiendo..." : "Añadir"}
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
