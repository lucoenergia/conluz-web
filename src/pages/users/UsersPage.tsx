import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, shadows, colors, fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TablePagination,
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Divider,
  TableSortLabel,
  Button,
  Tooltip,
} from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { SearchBar } from "../../components/SearchBar";
import { DetailHeader } from "../../components/DetailHeader";
import { FilterChipsBar, type FilterStatus } from "../../components/FilterChips";
import { RecordList } from "../../components/RecordList";
import { ListTable, ListTableHeaderText, RowActionsMenu } from "../../components/ListTable";
import { ResultStatus } from "../../components/ResultStatus";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import type { FC } from "react";

import PeopleIcon from "@mui/icons-material/People";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import LockResetIcon from "@mui/icons-material/LockReset";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AddModeratorIcon from "@mui/icons-material/AddModerator";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";

import {
  useGetAllUsers,
  useDisableUser,
  useEnableUser,
  useGrantPlatformAdmin,
  useRevokePlatformAdmin,
} from "../../api/users/users";
import { useGetAllCommunities } from "../../api/communities/communities";
import type { CommunityResponse } from "../../api/models";
import type { AxiosError } from "axios";
import { useDebounce } from "../../utils/useDebounce";
import { DisablePartnerConfirmationModal } from "../../components/Modals/DisablePartnerConfirmationModal";
import { EnablePartnerConfirmationModal } from "../../components/Modals/EnablePartnerConfirmationModal";
import { DisablePartnerSuccessModal } from "../../components/Modals/DisablePartnerSuccessModal";
import { ResetPasswordConfirmationModal } from "../../components/Modals/ResetPasswordConfirmationModal";
import { GrantPlatformAdminConfirmationModal } from "../../components/Modals/GrantPlatformAdminConfirmationModal";
import { RevokePlatformAdminConfirmationModal } from "../../components/Modals/RevokePlatformAdminConfirmationModal";
import { PlatformAdminSuccessModal } from "../../components/Modals/PlatformAdminSuccessModal";
import { useErrorDispatch } from "../../context/error.context";
import { useLoggedUser } from "../../context/logged-user.context";
import { useIsPlatformAdmin } from "../../hooks/useActiveCommunityRole";

type OrderDirection = "asc" | "desc";
type OrderBy = "fullName" | "personalId";

const MAX_COMMUNITY_CHIPS = 2;

function UserCommunitiesCell({
  memberships,
  communities,
}: {
  memberships?: Record<string, string>;
  communities: CommunityResponse[];
}) {
  if (!memberships) {
    return <Typography variant="body2" sx={{ color: colors.text.subtle }}>—</Typography>;
  }
  const entries = Object.entries(memberships);
  if (entries.length === 0) {
    return <Typography variant="body2" sx={{ color: colors.text.subtle }}>—</Typography>;
  }
  const safeList = Array.isArray(communities) ? communities : [];
  const shown = entries.slice(0, MAX_COMMUNITY_CHIPS);
  const overflow = entries.length - MAX_COMMUNITY_CHIPS;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {shown.map(([communityId, role]) => {
        const community = safeList.find((c) => c.id === communityId);
        const label = community?.name ?? communityId.slice(0, 8);
        const isAdmin = role === "COMMUNITY_ADMIN";
        return (
          <Chip
            key={communityId}
            label={`${label} · ${isAdmin ? "Admin" : "Miembro"}`}
            size="small"
            color={isAdmin ? "primary" : "default"}
            variant="outlined"
            sx={{ fontSize: fontSizes.xs }}
          />
        );
      })}
      {overflow > 0 && (
        <Chip
          label={`+${overflow}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: fontSizes.xs, color: colors.text.subtle }}
        />
      )}
    </Box>
  );
}

interface FilterState {
  search: string;
  status: FilterStatus;
}

export const UsersPage: FC = () => {
  const { width } = useWindowDimensions();
  // Render ONE layout, not two hidden copies: a stacked list below the
  // project's desktop breakpoint, the table above it.
  const isNarrow = width < MIN_DESKTOP_WIDTH;

  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>("fullName");
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("asc");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    enabled: boolean;
    isPlatformAdmin: boolean;
  } | null>(null);
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [showDisableSuccess, setShowDisableSuccess] = useState(false);
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false);
  const [wasEnabled, setWasEnabled] = useState(false);
  const [showPlatformAdminConfirmation, setShowPlatformAdminConfirmation] = useState(false);
  const [showPlatformAdminSuccess, setShowPlatformAdminSuccess] = useState(false);
  const [wasGranted, setWasGranted] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 500);
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const loggedUser = useLoggedUser();
  const isPlatformAdmin = useIsPlatformAdmin();
  const disableUserMutation = useDisableUser();
  const enableUserMutation = useEnableUser();
  const grantMutation = useGrantPlatformAdmin();
  const revokeMutation = useRevokePlatformAdmin();

  const { data, isLoading, error, refetch } = useGetAllUsers({ size: 10000 });
  const { data: communitiesList = [] } = useGetAllCommunities();

  const { filteredUsers, paginatedUsers } = useMemo(() => {
    if (!data?.items) return { filteredUsers: [], paginatedUsers: [] };

    let filtered = [...data.items];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.personalId?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower),
      );
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((user) => (filters.status === "active" ? user.enabled : !user.enabled));
    }

    filtered.sort((a, b) => {
      const aStr = String(a[orderBy] ?? "").toLowerCase();
      const bStr = String(b[orderBy] ?? "").toLowerCase();
      if (aStr < bStr) return orderDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return orderDirection === "asc" ? 1 : -1;
      return 0;
    });

    const startIndex = page * rowsPerPage;
    const paginatedUsers = filtered.slice(startIndex, startIndex + rowsPerPage);

    return { filteredUsers: filtered, paginatedUsers };
  }, [data?.items, debouncedSearch, filters.status, orderBy, orderDirection, page, rowsPerPage]);

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    userId: string,
    userName: string,
    enabled: boolean,
    userIsPlatformAdmin: boolean,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser({ id: userId, name: userName, enabled, isPlatformAdmin: userIsPlatformAdmin });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleToggleStatusClick = () => {
    handleMenuClose();
    setShowDisableConfirmation(true);
  };

  const handleDisableConfirm = async () => {
    if (!selectedUser) return;

    try {
      if (selectedUser.enabled) {
        await disableUserMutation.mutateAsync({ userId: selectedUser.id });
        setWasEnabled(false);
      } else {
        await enableUserMutation.mutateAsync({ userId: selectedUser.id });
        setWasEnabled(true);
      }
      setShowDisableConfirmation(false);
      setShowDisableSuccess(true);
      refetch();
    } catch (err) {
      errorDispatch(
        selectedUser.enabled
          ? "Error al deshabilitar el usuario. Por favor, inténtalo de nuevo."
          : "Error al habilitar el usuario. Por favor, inténtalo de nuevo.",
      );
      setShowDisableConfirmation(false);
      console.error("Error toggling user status:", err);
    }
  };

  const handleDisableCancel = () => {
    setShowDisableConfirmation(false);
  };

  const handleDisableSuccessClose = () => {
    setShowDisableSuccess(false);
    setSelectedUser(null);
  };

  const handlePlatformAdminClick = () => {
    handleMenuClose();
    setShowPlatformAdminConfirmation(true);
  };

  const handlePlatformAdminConfirm = async () => {
    if (!selectedUser) return;

    const wasGrantOperation = !selectedUser.isPlatformAdmin;
    try {
      if (selectedUser.isPlatformAdmin) {
        await revokeMutation.mutateAsync({ userId: selectedUser.id });
      } else {
        await grantMutation.mutateAsync({ userId: selectedUser.id });
      }
      setWasGranted(wasGrantOperation);
      setShowPlatformAdminConfirmation(false);
      setShowPlatformAdminSuccess(true);
      refetch();
    } catch (err) {
      const message =
        (err as AxiosError<{ message?: string }>)?.response?.data?.message ??
        "No se pudo actualizar el rol de administrador de plataforma.";
      errorDispatch(message);
      setShowPlatformAdminConfirmation(false);
      console.error("Error updating platform-admin role:", err);
    }
  };

  const handlePlatformAdminCancel = () => {
    setShowPlatformAdminConfirmation(false);
  };

  const handlePlatformAdminSuccessClose = () => {
    setShowPlatformAdminSuccess(false);
    setSelectedUser(null);
  };

  const handleResetPasswordClick = () => {
    handleMenuClose();
    setShowResetPasswordConfirmation(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!selectedUser) return;

    try {
      // TODO: Call reset password API endpoint when available
      setShowResetPasswordConfirmation(false);
    } catch (err) {
      errorDispatch("Error al enviar el email de reestablecimiento. Por favor, inténtalo de nuevo.");
      setShowResetPasswordConfirmation(false);
      console.error("Error resetting password:", err);
    }
  };

  const handleResetPasswordCancel = () => {
    setShowResetPasswordConfirmation(false);
  };

  const handleEditClick = () => {
    if (!selectedUser) return;
    handleMenuClose();
    navigate(`/users/${selectedUser.id}/edit`);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleFilterChange = (filterType: keyof FilterState, value: FilterState[keyof FilterState]) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    setPage(0);
  };

  const stats = useMemo(() => {
    if (!data?.items) return { total: 0, active: 0, inactive: 0 };
    return {
      total: data.items.length,
      active: data.items.filter((u) => u.enabled).length,
      inactive: data.items.filter((u) => !u.enabled).length,
    };
  }, [data]);

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
          { label: "Usuarios", href: "/users" },
        ]}
      />

      <DetailHeader
        variant="list"
        icon={<PeopleIcon />}
        title="Gestión de Usuarios"
        subtitle="Administra los usuarios de la plataforma"
        keyFacts={[
          { label: "Total", value: stats.total },
          { label: "Activos", value: stats.active },
          { label: "Inactivos", value: stats.inactive },
        ]}
      />

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                component={Link}
                to="/users/new"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                sx={{
                  background: theme.palette.primary.main,
                  px: 3,
                  py: 1.5,
                  boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    transform: `translateY(${motion.lift})`,
                    boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                  transition: interactiveTransition("0.3s", "ease"),
                }}
              >
                Nuevo Usuario
              </Button>
            </Box>

            <FilterChipsBar value={filters.status} onChange={(value) => handleFilterChange("status", value)} />

            <SearchBar
              value={filters.search}
              onChange={(value) =>
                handleSearchChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
              }
              placeholder="Buscar por nombre, NIF/CIF o email..."
            />
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
              Error al cargar los usuarios. Por favor, intente de nuevo.
            </Alert>
          ) : (
            <>
              <ResultStatus
                isLoading={isLoading}
                count={filteredUsers.length}
                noun={{ one: "usuario", other: "usuarios" }}
                emptyMessage="No se encontraron usuarios"
              />

              {!isNarrow && (
              <ListTable
                rows={paginatedUsers}
                getRowKey={(user) => user.id}
                isLoading={isLoading}
                emptyMessage="No se encontraron usuarios"
                rowActionsLabel={(user) => `Más acciones para ${user.fullName || "el usuario"}`}
                onRowActionsClick={(e, user) =>
                  handleMenuOpen(
                    e,
                    user.id || "",
                    user.fullName || "Sin nombre",
                    user.enabled || false,
                    user.isPlatformAdmin || false,
                  )
                }
                columns={[
                  {
                    key: "fullName",
                    header: (
                      <TableSortLabel
                        active={orderBy === "fullName"}
                        direction={orderBy === "fullName" ? orderDirection : "asc"}
                        onClick={() => handleSort("fullName")}
                      >
                        <ListTableHeaderText>Nombre</ListTableHeaderText>
                      </TableSortLabel>
                    ),
                    render: (user) => (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: theme.palette.primary.main,
                            fontSize: fontSizes.md,
                          }}
                        >
                          {user.fullName?.charAt(0).toUpperCase() || "?"}
                        </Avatar>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {user.fullName || "Sin nombre"}
                          </Typography>
                          {user.isPlatformAdmin && (
                            <Chip
                              icon={<AdminPanelSettingsIcon />}
                              label="Admin plataforma"
                              size="small"
                              color="primary"
                              variant="outlined"
                              aria-label="Administrador de plataforma"
                              sx={{ fontSize: fontSizes.xs }}
                            />
                          )}
                        </Box>
                      </Box>
                    ),
                  },
                  {
                    key: "personalId",
                    header: (
                      <TableSortLabel
                        active={orderBy === "personalId"}
                        direction={orderBy === "personalId" ? orderDirection : "asc"}
                        onClick={() => handleSort("personalId")}
                      >
                        <ListTableHeaderText>NIF/CIF</ListTableHeaderText>
                      </TableSortLabel>
                    ),
                    render: (user) => (
                      <Typography variant="body2" sx={{ color: "secondary.main" }}>
                        {user.personalId || "-"}
                      </Typography>
                    ),
                  },
                  {
                    key: "email",
                    header: "Email",
                    render: (user) => (
                      <Typography variant="body2" sx={{ color: "secondary.main" }}>
                        {user.email || "-"}
                      </Typography>
                    ),
                  },
                  {
                    key: "phoneNumber",
                    header: "Teléfono",
                    render: (user) => (
                      <Typography variant="body2" sx={{ color: "secondary.main" }}>
                        {user.phoneNumber || "-"}
                      </Typography>
                    ),
                  },
                  {
                    key: "status",
                    header: "Estado",
                    render: (user) => (
                      <Chip
                        label={user.enabled ? "Activo" : "Inactivo"}
                        color={user.enabled ? "success" : "error"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ),
                  },
                  {
                    key: "communities",
                    header: "Comunidades",
                    cellSx: { maxWidth: 220 },
                    render: (user) => (
                      <UserCommunitiesCell
                        memberships={user.memberships as Record<string, string> | undefined}
                        communities={communitiesList}
                      />
                    ),
                  },
                ]}
              />
              )}

              {isNarrow && (
              <Box sx={{ p: 2 }}>
                <RecordList
                  label="Usuarios"
                  isLoading={isLoading}
                  emptyMessage="No se encontraron usuarios"
                  items={paginatedUsers.map((user) => ({
                    id: user.id || "",
                    avatar: (
                      <Avatar
                        sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}
                      >
                        {user.fullName?.charAt(0).toUpperCase() || "?"}
                      </Avatar>
                    ),
                    title: user.fullName || "Sin nombre",
                    badge: user.isPlatformAdmin ? (
                      <Chip
                        icon={<AdminPanelSettingsIcon />}
                        label="Admin plataforma"
                        size="small"
                        color="primary"
                        variant="outlined"
                        aria-label="Administrador de plataforma"
                        sx={{ fontSize: fontSizes.xs }}
                      />
                    ) : undefined,
                    status: (
                      <Chip
                        label={user.enabled ? "Activo" : "Inactivo"}
                        color={user.enabled ? "success" : "error"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ),
                    actions: (
                      <IconButton
                        aria-label={`Más acciones para ${user.fullName || "el usuario"}`}
                        onClick={(e) =>
                          handleMenuOpen(
                            e,
                            user.id || "",
                            user.fullName || "Sin nombre",
                            user.enabled || false,
                            user.isPlatformAdmin || false,
                          )
                        }
                        sx={sxStyles.touchTarget}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    ),
                    fields: [
                      { label: "NIF/CIF", value: user.personalId || "-" },
                      { label: "Email", value: user.email || "-" },
                      { label: "Teléfono", value: user.phoneNumber || "-" },
                      {
                        label: "Comunidades",
                        value: (
                          <UserCommunitiesCell
                            memberships={user.memberships as Record<string, string> | undefined}
                            communities={communitiesList}
                          />
                        ),
                      },
                    ],
                  }))}
                />
              </Box>
              )}

              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                sx={{
                  borderTop: `1px solid ${colors.divider}`,
                  ".MuiTablePagination-toolbar": { px: 2 },
                }}
              />
            </>
          )}
        </Paper>
      </Box>

      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          </ListItemIcon>
          <ListItemText>Editar datos</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleResetPasswordClick}>
          <ListItemIcon>
            <LockResetIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          </ListItemIcon>
          <ListItemText>Reestablecer contraseña</ListItemText>
        </MenuItem>
        <Divider />
        {selectedUser?.enabled ? (
          <MenuItem onClick={handleToggleStatusClick}>
            <ListItemIcon>
              <BlockIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText sx={{ color: "error.main" }}>Deshabilitar</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleToggleStatusClick}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
            </ListItemIcon>
            <ListItemText sx={{ color: "success.main" }}>Habilitar</ListItemText>
          </MenuItem>
        )}
        {isPlatformAdmin &&
          (selectedUser?.isPlatformAdmin ? (
            // Tooltip needs a non-disabled wrapper to receive hover events when the item is disabled.
            <Tooltip
              title={selectedUser?.id === loggedUser?.id ? "No puedes revocar tu propio rol" : ""}
              placement="left"
            >
              <span>
                <MenuItem
                  onClick={handlePlatformAdminClick}
                  disabled={selectedUser?.id === loggedUser?.id}
                >
                  <ListItemIcon>
                    <RemoveModeratorIcon fontSize="small" sx={{ color: "error.main" }} />
                  </ListItemIcon>
                  <ListItemText sx={{ color: "error.main" }}>Revocar admin de plataforma</ListItemText>
                </MenuItem>
              </span>
            </Tooltip>
          ) : (
            <MenuItem onClick={handlePlatformAdminClick}>
              <ListItemIcon>
                <AddModeratorIcon fontSize="small" sx={{ color: "primary.main" }} />
              </ListItemIcon>
              <ListItemText sx={{ color: "primary.main" }}>Conceder admin de plataforma</ListItemText>
            </MenuItem>
          ))}
      </RowActionsMenu>

      {selectedUser?.enabled ? (
        <DisablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUser?.name || ""}
          onCancel={handleDisableCancel}
          onDisable={handleDisableConfirm}
        />
      ) : (
        <EnablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUser?.name || ""}
          onCancel={handleDisableCancel}
          onEnable={handleDisableConfirm}
        />
      )}

      <DisablePartnerSuccessModal
        isOpen={showDisableSuccess}
        partnerName={selectedUser?.name || ""}
        wasEnabled={wasEnabled}
        onClose={handleDisableSuccessClose}
      />

      <ResetPasswordConfirmationModal
        isOpen={showResetPasswordConfirmation}
        partnerName={selectedUser?.name || ""}
        onCancel={handleResetPasswordCancel}
        onReset={handleResetPasswordConfirm}
      />

      {selectedUser?.isPlatformAdmin ? (
        <RevokePlatformAdminConfirmationModal
          isOpen={showPlatformAdminConfirmation}
          userName={selectedUser?.name || ""}
          isPending={revokeMutation.isPending}
          onCancel={handlePlatformAdminCancel}
          onConfirm={handlePlatformAdminConfirm}
        />
      ) : (
        <GrantPlatformAdminConfirmationModal
          isOpen={showPlatformAdminConfirmation}
          userName={selectedUser?.name || ""}
          isPending={grantMutation.isPending}
          onCancel={handlePlatformAdminCancel}
          onConfirm={handlePlatformAdminConfirm}
        />
      )}

      <PlatformAdminSuccessModal
        isOpen={showPlatformAdminSuccess}
        userName={selectedUser?.name || ""}
        wasGranted={wasGranted}
        onClose={handlePlatformAdminSuccessClose}
      />
    </Box>
  );
};
