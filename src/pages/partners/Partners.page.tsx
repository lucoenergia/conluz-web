import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { useTheme, alpha } from "@mui/material/styles";
import { radii, shadows, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  TableSortLabel,
  Button,
} from "@mui/material";
import { BreadCrumb } from "../../components/Breadcrumb";
import { SearchBar } from "../../components/SearchBar";
import { PageHeaderWithStats } from "../../components/PageHeader";
import { FilterChipsBar, type FilterStatus } from "../../components/FilterChips";
import type { FC } from "react";

import PeopleIcon from "@mui/icons-material/People";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import LockResetIcon from "@mui/icons-material/LockReset";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { useGetAllUsers, useDisableUser, useEnableUser } from "../../api/users/users";
import { useDebounce } from "../../utils/useDebounce";
import { DisablePartnerConfirmationModal } from "../../components/Modals/DisablePartnerConfirmationModal";
import { EnablePartnerConfirmationModal } from "../../components/Modals/EnablePartnerConfirmationModal";
import { DisablePartnerSuccessModal } from "../../components/Modals/DisablePartnerSuccessModal";
import { ResetPasswordConfirmationModal } from "../../components/Modals/ResetPasswordConfirmationModal";
import { ImportPartnersModal } from "../../components/Modals/ImportPartnersModal";
import { useErrorDispatch } from "../../context/error.context";

type OrderDirection = 'asc' | 'desc';
type OrderBy = 'number' | 'fullName' | 'personalId';

interface FilterState {
  search: string;
  status: FilterStatus;
}

export const PartnersPage: FC = () => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<OrderBy>('number');
  const [orderDirection, setOrderDirection] = useState<OrderDirection>('asc');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; enabled: boolean } | null>(null);
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [showDisableSuccess, setShowDisableSuccess] = useState(false);
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [wasEnabled, setWasEnabled] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 500);
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();
  const disableUserMutation = useDisableUser();
  const enableUserMutation = useEnableUser();

  // Fetch users data - using large size to get all users and handle pagination client-side
  // TODO: Backend CORS configuration needed for proper server-side pagination with sort parameters
  const { data, isLoading, error, refetch } = useGetAllUsers({
    size: 10000,
  });

  // Filter, sort, and paginate users client-side
  const { filteredUsers, paginatedUsers } = useMemo(() => {
    if (!data?.items) return { filteredUsers: [], paginatedUsers: [] };

    let filtered = [...data.items];

    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.personalId?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user =>
        filters.status === 'active' ? user.enabled : !user.enabled
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aStr = String(a[orderBy] ?? '').toLowerCase();
      const bStr = String(b[orderBy] ?? '').toLowerCase();

      if (aStr < bStr) return orderDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return orderDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const startIndex = page * rowsPerPage;
    const paginatedUsers = filtered.slice(startIndex, startIndex + rowsPerPage);

    return { filteredUsers: filtered, paginatedUsers };
  }, [data?.items, debouncedSearch, filters.status, orderBy, orderDirection, page, rowsPerPage]);

  const handleSort = (property: OrderBy) => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, userId: string, userName: string, enabled: boolean) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser({ id: userId, name: userName, enabled });
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
        // Disable user
        await disableUserMutation.mutateAsync({ id: selectedUser.id });
        setWasEnabled(false);
      } else {
        // Enable user
        await enableUserMutation.mutateAsync({ id: selectedUser.id });
        setWasEnabled(true);
      }
      setShowDisableConfirmation(false);
      setShowDisableSuccess(true);
      refetch();
    } catch (error) {
      errorDispatch(
        selectedUser.enabled
          ? "Error al deshabilitar el socio. Por favor, inténtalo de nuevo."
          : "Error al habilitar el socio. Por favor, inténtalo de nuevo."
      );
      setShowDisableConfirmation(false);
      console.error("Error toggling user status:", error);
    }
  };

  const handleDisableCancel = () => {
    setShowDisableConfirmation(false);
  };

  const handleDisableSuccessClose = () => {
    setShowDisableSuccess(false);
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
      // await resetPasswordMutation.mutateAsync({ id: selectedUser.id });
      setShowResetPasswordConfirmation(false);
      // Show success message or notification
    } catch (error) {
      errorDispatch("Error al enviar el email de reestablecimiento. Por favor, inténtalo de nuevo.");
      setShowResetPasswordConfirmation(false);
      console.error("Error resetting password:", error);
    }
  };

  const handleResetPasswordCancel = () => {
    setShowResetPasswordConfirmation(false);
  };

  const handleOpenImportModal = () => {
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
  };

  const handleImportComplete = () => {
    refetch();
  };

  const handleEditClick = () => {
    if (!selectedUser) return;
    handleMenuClose();
    navigate(`/partners/${selectedUser.id}/edit`);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: event.target.value }));
    setPage(0);
  };

  const handleFilterChange = (filterType: keyof FilterState, value: FilterState[keyof FilterState]) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
    setPage(0);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.items) return { total: 0, active: 0, inactive: 0 };

    return {
      total: data.items.length,
      active: data.items.filter(u => u.enabled).length,
      inactive: data.items.filter(u => !u.enabled).length,
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
      {/* Breadcrumb */}
      <BreadCrumb
        steps={[
          { label: "Inicio", href: "/" },
          { label: "Socios", href: "/partners" },
        ]}
      />

      {/* Header Section */}
      <PageHeaderWithStats
        icon={PeopleIcon}
        title="Gestión de Socios"
        subtitle="Administra los miembros de tu comunidad energética"
        stats={[
          { value: stats.total, label: "Total" },
          { value: stats.active, label: "Activos", color: colors.success },
          { value: stats.inactive, label: "Inactivos", color: colors.error.main },
        ]}
      />

      {/* Search and Filters Section */}
      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper
          elevation={0}
          sx={sxStyles.softPanel}
        >
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
            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                component={Link}
                to="/partners/new"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                sx={{
                  background: theme.palette.primary.main,
                  px: 3,
                  py: 1.5,
                  boxShadow: `0 4px 15px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Nuevo Socio
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleOpenImportModal}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Importar CSV
              </Button>
            </Box>

            {/* Filter Chips */}
          <FilterChipsBar
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
          />

            {/* Search Bar */}
            <SearchBar
              value={filters.search}
              onChange={(value) => handleSearchChange({ target: { value }} as React.ChangeEvent<HTMLInputElement>)}
              placeholder="Buscar por nombre, NIF/CIF o email..."
            />
          </Box>

          
        </Paper>
      </Box>

      {/* Table Section */}
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
              Error al cargar los socios. Por favor, intente de nuevo.
            </Alert>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: colors.background.surface }}>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'number'}
                          direction={orderBy === 'number' ? orderDirection : 'asc'}
                          onClick={() => handleSort('number')}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                            Nº Socio
                          </Typography>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'fullName'}
                          direction={orderBy === 'fullName' ? orderDirection : 'asc'}
                          onClick={() => handleSort('fullName')}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                            Nombre
                          </Typography>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === 'personalId'}
                          direction={orderBy === 'personalId' ? orderDirection : 'asc'}
                          onClick={() => handleSort('personalId')}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                            NIF/CIF
                          </Typography>
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                          Email
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                          Teléfono
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
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body1" color="text.secondary">
                            No se encontraron socios
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          sx={{
                            "&:hover": { backgroundColor: colors.background.surface },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                              #{user.number || '-'}
                            </Typography>
                          </TableCell>
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
                                {user.fullName?.charAt(0).toUpperCase() || '?'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                                  {user.fullName || 'Sin nombre'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: "secondary.main" }}>
                              {user.personalId || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: "secondary.main" }}>
                              {user.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: "secondary.main" }}>
                              {user.phoneNumber || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.enabled ? "Activo" : "Inactivo"}
                              color={user.enabled ? "success" : "error"}
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, user.id || '', user.fullName || 'Sin nombre', user.enabled || false)}
                              sx={{
                                color: colors.text.subtle,
                                // eslint-disable-next-line no-restricted-syntax -- icon-button hover tint (Tailwind gray-100); no matching token
                                "&:hover": { backgroundColor: "#f3f4f6" },
                              }}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: "visible",
            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
            mt: 1.5,
            minWidth: 200,
            "& .MuiAvatar-root": {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            "&:before": {
              content: '""',
              display: "block",
              position: "absolute",
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: "background.paper",
              transform: "translateY(-50%) rotate(45deg)",
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          </ListItemIcon>
          <ListItemText>Editar datos</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedUser) {
            navigate(`/partners/${selectedUser.id}/supply-points`);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <ElectricBoltIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          </ListItemIcon>
          <ListItemText>Puntos de suministro</ListItemText>
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
      </Menu>

      {/* Disable/Enable Confirmation Modal */}
      {selectedUser?.enabled ? (
        <DisablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUser?.name || ''}
          onCancel={handleDisableCancel}
          onDisable={handleDisableConfirm}
        />
      ) : (
        <EnablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUser?.name || ''}
          onCancel={handleDisableCancel}
          onEnable={handleDisableConfirm}
        />
      )}

      {/* Disable/Enable Success Modal */}
      <DisablePartnerSuccessModal
        isOpen={showDisableSuccess}
        partnerName={selectedUser?.name || ''}
        wasEnabled={wasEnabled}
        onClose={handleDisableSuccessClose}
      />

      {/* Reset Password Confirmation Modal */}
      <ResetPasswordConfirmationModal
        isOpen={showResetPasswordConfirmation}
        partnerName={selectedUser?.name || ''}
        onCancel={handleResetPasswordCancel}
        onReset={handleResetPasswordConfirm}
      />

      {/* Import Partners Modal */}
      <ImportPartnersModal
        isOpen={showImportModal}
        onClose={handleCloseImportModal}
        onImportComplete={handleImportComplete}
      />
    </Box>
  );
};