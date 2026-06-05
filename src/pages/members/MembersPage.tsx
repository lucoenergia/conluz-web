import { useState, type FC } from "react";
import { useTheme } from "@mui/material/styles";
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
  TextField,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
} from "../../api/memberships/memberships";
import { useGetAllUsers } from "../../api/users/users";
import { CommunityRole } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";

const ROLE_LABELS: Record<string, string> = {
  [CommunityRole.COMMUNITY_MEMBER]: "Miembro",
  [CommunityRole.COMMUNITY_ADMIN]: "Administrador",
};

export const MembersPage: FC = () => {
  const theme = useTheme();
  const activeCommunityId = useActiveCommunity();
  const errorDispatch = useErrorDispatch();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(CommunityRole.COMMUNITY_MEMBER);

  const {
    data: memberships = [],
    isLoading,
    error,
    refetch,
  } = useGetMemberships(activeCommunityId ?? "", {
    query: { enabled: !!activeCommunityId },
  });

  const { data: allUsersData } = useGetAllUsers({ size: 10000 });

  const createMembership = useCreateMembership();
  const deleteMembership = useDeleteMembership();
  const updateRole = useUpdateMembershipRole();

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
        data: { userId: selectedUserId, role: selectedRole as CommunityRole },
      });
      setAddDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole(CommunityRole.COMMUNITY_MEMBER);
      refetch();
    } catch {
      errorDispatch("Error al añadir el miembro. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeCommunityId) return;
    try {
      await deleteMembership.mutateAsync({ id: activeCommunityId, userId });
      refetch();
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
        data: { role: newRole as CommunityRole },
      });
      refetch();
    } catch {
      errorDispatch("Error al actualizar el rol. Por favor, inténtalo de nuevo.");
    }
  };

  const existingUserIds = new Set(memberships.map((m) => m.userId));
  const availableUsers = allUsersData?.items?.filter((u) => u.id && !existingUserIds.has(u.id)) ?? [];

  const activeCount = memberships.filter((m) => m.enabled).length;
  const adminCount = memberships.filter((m) => m.role === CommunityRole.COMMUNITY_ADMIN).length;

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
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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
                    memberships.map((membership) => {
                      const user = allUsersData?.items?.find((u) => u.id === membership.userId);
                      return (
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
                                {(user?.fullName ?? "?").charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {user?.fullName ?? membership.userId}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                                  {user?.email ?? ""}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <Select
                                value={membership.role ?? CommunityRole.COMMUNITY_MEMBER}
                                onChange={(e) =>
                                  handleRoleChange(membership.userId!, e.target.value)
                                }
                              >
                                <MenuItem value={CommunityRole.COMMUNITY_MEMBER}>
                                  {ROLE_LABELS[CommunityRole.COMMUNITY_MEMBER]}
                                </MenuItem>
                                <MenuItem value={CommunityRole.COMMUNITY_ADMIN}>
                                  {ROLE_LABELS[CommunityRole.COMMUNITY_ADMIN]}
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
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => handleRemoveMember(membership.userId!)}
                              sx={{ fontSize: fontSizes.sm }}
                            >
                              Eliminar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

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
              <MenuItem value={CommunityRole.COMMUNITY_MEMBER}>
                {ROLE_LABELS[CommunityRole.COMMUNITY_MEMBER]}
              </MenuItem>
              <MenuItem value={CommunityRole.COMMUNITY_ADMIN}>
                {ROLE_LABELS[CommunityRole.COMMUNITY_ADMIN]}
              </MenuItem>
            </Select>
          </FormControl>
          <TextField label="ID de comunidad" value={activeCommunityId} disabled fullWidth />
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
    </Box>
  );
};
