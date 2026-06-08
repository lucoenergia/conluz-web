import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
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
  Tooltip,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import { radii, shadows, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PageHeaderWithStats } from "../../components/PageHeader";
import { useActiveCommunity } from "../../context/community.context";
import {
  useGetMemberships,
  useCreateMembership,
  useDeleteMembership,
  useUpdateMembershipRole,
  getGetMembershipsQueryKey,
} from "../../api/memberships/memberships";
import { getGetAllCommunitiesQueryKey } from "../../api/communities/communities";
import { useGetAllUsers } from "../../api/users/users";
import {
  CreateMembershipBodyRole,
  MembershipResponseRole,
  UpdateMembershipRoleBodyRole,
} from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";
import { ImportPartnersModal } from "../../components/Modals/ImportPartnersModal";

const ROLE_LABELS: Record<string, string> = {
  [MembershipResponseRole.COMMUNITY_MEMBER]: "Miembro",
  [MembershipResponseRole.COMMUNITY_ADMIN]: "Administrador",
};

export const MembersPage: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const activeCommunityId = useActiveCommunity();
  const errorDispatch = useErrorDispatch();
  const queryClient = useQueryClient();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(CreateMembershipBodyRole.COMMUNITY_MEMBER);
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);

  const {
    data: memberships = [],
    isLoading,
    error,
  } = useGetMemberships(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });

  const { data: allUsersData } = useGetAllUsers({ size: 10000 });

  const createMembership = useCreateMembership();
  const deleteMembership = useDeleteMembership();
  const updateRole = useUpdateMembershipRole();

  const invalidateAfterWrite = () => {
    queryClient.invalidateQueries({ queryKey: getGetMembershipsQueryKey(activeCommunityId ?? "") });
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
  };

  if (!activeCommunityId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Selecciona una comunidad activa para gestionar sus miembros.
        </Alert>
      </Box>
    );
  }

  const handleAddMember = async () => {
    if (!selectedUserId || !activeCommunityId) return;
    try {
      await createMembership.mutateAsync({
        id: activeCommunityId,
        data: { userId: selectedUserId, role: selectedRole as CreateMembershipBodyRole },
      });
      setAddDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole(CreateMembershipBodyRole.COMMUNITY_MEMBER);
      invalidateAfterWrite();
    } catch {
      errorDispatch("Error al añadir el miembro. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeCommunityId) return;
    try {
      await deleteMembership.mutateAsync({ id: activeCommunityId, userId });
      setRemoveConfirmUserId(null);
      invalidateAfterWrite();
    } catch {
      errorDispatch("Error al eliminar el miembro. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!activeCommunityId) return;
    try {
      await updateRole.mutateAsync({
        id: activeCommunityId,
        userId,
        data: { role: newRole as UpdateMembershipRoleBodyRole },
      });
      invalidateAfterWrite();
    } catch {
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

      <PageHeaderWithStats
        icon={PeopleIcon}
        title="Gestión de Miembros"
        subtitle="Administra los miembros de la comunidad activa"
        stats={[
          { value: memberships.length, label: "Total" },
          { value: activeCount, label: "Activos", color: colors.success },
          { value: adminCount, label: "Admins", color: theme.palette.primary.main },
        ]}
      />

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => setShowImportModal(true)}
              sx={{ px: 3, py: 1.5 }}
            >
              Importar usuarios
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ px: 3, py: 1.5 }}
            >
              Añadir miembro
            </Button>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.background.surface }}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Usuario
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Rol
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Estado
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Acciones
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : memberships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No hay miembros en esta comunidad
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    memberships.map((membership) => (
                      <TableRow
                        key={membership.id}
                        sx={{
                          "&:hover": { backgroundColor: colors.background.surface },
                          transition: "background-color 0.2s",
                        }}
                      >
                        <TableCell>
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
                                {membership.user?.fullName ?? "Usuario desconocido"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                                {membership.user?.email ?? ""}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select
                              value={membership.role ?? MembershipResponseRole.COMMUNITY_MEMBER}
                              onChange={(e) =>
                                handleRoleChange(membership.user?.id ?? "", e.target.value)
                              }
                            >
                              <MenuItem value={MembershipResponseRole.COMMUNITY_MEMBER}>
                                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_MEMBER]}
                              </MenuItem>
                              <MenuItem value={MembershipResponseRole.COMMUNITY_ADMIN}>
                                {ROLE_LABELS[MembershipResponseRole.COMMUNITY_ADMIN]}
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={membership.enabled ? "Activo" : "Inactivo"}
                            color={membership.enabled ? "success" : "error"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "center" }}>
                            <Tooltip title="Puntos de suministro">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/supply-points?personId=${membership.user?.id}`)}
                                sx={{ color: theme.palette.primary.main }}
                              >
                                <ElectricBoltIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => setRemoveConfirmUserId(membership.user?.id ?? null)}
                              sx={{ fontSize: fontSizes.sm }}
                            >
                              Eliminar
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      <ImportPartnersModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={invalidateAfterWrite}
      />

      {/* Add member dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Añadir miembro a la comunidad</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Usuario</InputLabel>
            <Select
              value={selectedUserId}
              label="Usuario"
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
            disabled={!selectedUserId || createMembership.isPending}
          >
            {createMembership.isPending ? "Añadiendo..." : "Añadir"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove confirmation dialog */}
      <Dialog
        open={!!removeConfirmUserId}
        onClose={() => setRemoveConfirmUserId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar a{" "}
            <strong>{removeTarget?.user?.fullName ?? "este miembro"}</strong> de la comunidad?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemoveConfirmUserId(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => removeConfirmUserId && handleRemoveMember(removeConfirmUserId)}
            disabled={deleteMembership.isPending}
          >
            {deleteMembership.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
