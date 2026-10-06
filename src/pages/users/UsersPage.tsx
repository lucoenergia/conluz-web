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
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AddModeratorIcon from "@mui/icons-material/AddModerator";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";

import { useGetAllUsers } from "../../api/users/users";
import { useGetAllCommunities } from "../../api/communities/communities";
import type { CommunityResponse, UserResponse } from "../../api/models";
import { usePlatformActions, useUserActions, type Action, type UserRowActions } from "../../hooks/actions";
import { useDebounce } from "../../utils/useDebounce";
import { DisablePartnerConfirmationModal } from "../../components/Modals/DisablePartnerConfirmationModal";
import { EnablePartnerConfirmationModal } from "../../components/Modals/EnablePartnerConfirmationModal";
import { DisablePartnerSuccessModal } from "../../components/Modals/DisablePartnerSuccessModal";
import { GrantPlatformAdminConfirmationModal } from "../../components/Modals/GrantPlatformAdminConfirmationModal";
import { RevokePlatformAdminConfirmationModal } from "../../components/Modals/RevokePlatformAdminConfirmationModal";
import { PlatformAdminSuccessModal } from "../../components/Modals/PlatformAdminSuccessModal";
import { useErrorDispatch } from "../../context/error.context";

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

/**
 * Which half of a mutually exclusive pair applies to a row, and what it does.
 *
 * `canEnable`/`canDisable` and `canGrantPlatformAdmin`/`canRevokePlatformAdmin`
 * are *permission* answers -- "may this caller ever perform this operation on
 * this user". The only state the backend folds into them is whether the user is
 * the caller; its schema says exactly that, and says nothing about whether the
 * user is currently enabled or already a platform admin. So an administrator
 * looking at an active non-admin is handed all four, and a screen that treats
 * them as four exclusive affordances offers Habilitar beside Deshabilitar and
 * Conceder beside Revocar.
 *
 * Capability answers "may this person, ever"; the screen answers "is this the
 * legal operation right now". Both, in that order -- the rule
 * `useSharingAgreementActions` states for status and `SharingAgreementCard`
 * applies as `isDraft && canDelete`.
 *
 * Reading the row's own `enabled` and `isPlatformAdmin` here is reading the
 * resource's state, not re-deriving privilege. The rule the permissions module
 * enforces is about the *caller's* flag, through `useIsPlatformAdmin`, which
 * nothing on this screen touches. The alternative would be a backend flag
 * saying which half is applicable, and that is not a rule this API has.
 *
 * Resolved once so the menu item, its confirmation dialog and the handler that
 * runs it cannot disagree about which operation was chosen.
 */
type StatusToggle = { action: Action<[], boolean>; isDisabling: boolean } | undefined;
type PlatformAdminToggle = { action: Action<[], boolean>; isGranting: boolean } | undefined;

function statusToggleFor(user: UserResponse | null | undefined, actions: UserRowActions["actions"]): StatusToggle {
  if (!user) return undefined;
  if (user.enabled) return actions.disable && { action: actions.disable, isDisabling: true };
  return actions.enable && { action: actions.enable, isDisabling: false };
}

function platformAdminToggleFor(
  user: UserResponse | null | undefined,
  actions: UserRowActions["actions"],
): PlatformAdminToggle {
  if (!user) return undefined;
  if (user.isPlatformAdmin) {
    return actions.revokePlatformAdmin && { action: actions.revokePlatformAdmin, isGranting: false };
  }
  return actions.grantPlatformAdmin && { action: actions.grantPlatformAdmin, isGranting: true };
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
  // The id, not the row. A write invalidates the list, so a stored row would go
  // on answering from before the change -- and the flattened copy this used to
  // keep threw away `user.capabilities`, which is what now decides the menu.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [showDisableSuccess, setShowDisableSuccess] = useState(false);
  const [wasEnabled, setWasEnabled] = useState(false);
  const [showPlatformAdminConfirmation, setShowPlatformAdminConfirmation] = useState(false);
  const [showPlatformAdminSuccess, setShowPlatformAdminSuccess] = useState(false);
  const [wasGranted, setWasGranted] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 500);
  const errorDispatch = useErrorDispatch();
  const navigate = useNavigate();

  // What this caller may do, as the backend answers it. forUser is a plain
  // function rather than a hook precisely so it can be asked once per row.
  const { forUser } = useUserActions();
  const { createUser } = usePlatformActions().actions;

  const { data, isLoading, error } = useGetAllUsers({ size: 10000 });
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

  // Resolved from the list on every render rather than stored, so the row the
  // menu and its dialogs act on is the one the cache currently holds.
  const selectedUser = selectedUserId
    ? (data?.items?.find((user) => user.id === selectedUserId) ?? null)
    : null;
  const selectedActions = forUser(selectedUser ?? undefined).actions;
  const selectedStatusToggle = statusToggleFor(selectedUser, selectedActions);
  const selectedPlatformAdminToggle = platformAdminToggleFor(selectedUser, selectedActions);
  const selectedUserName = selectedUser?.fullName ?? "Sin nombre";

  // No permitted action means no menu at all, rather than a menu with nothing in
  // it or items the backend would refuse. Deleting an account is not offered on
  // this screen, so `remove` is deliberately not part of the answer.
  const hasRowActions = (user: UserResponse) => {
    const actions = forUser(user).actions;
    // Resolved the same way the menu resolves it: a row is only offered the half
    // of each pair that applies to its current state, so the kebab must count
    // those and not both halves.
    return !!actions.edit || !!statusToggleFor(user, actions) || !!platformAdminToggleFor(user, actions);
  };

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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: UserResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(user.id ?? null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleToggleStatusClick = () => {
    handleMenuClose();
    setShowDisableConfirmation(true);
  };

  const handleDisableConfirm = async () => {
    // The half that applies to this row, resolved once above. Picking with `??`
    // here was the bug: both halves are permitted at once, so `disable` always
    // won and "Habilitar" disabled the user. The action invalidates the list
    // itself, so there is no refetch left to do.
    if (!selectedStatusToggle) return;
    const { action, isDisabling: wasDisabling } = selectedStatusToggle;

    if (await action.run()) {
      setWasEnabled(!wasDisabling);
      setShowDisableConfirmation(false);
      setShowDisableSuccess(true);
    } else {
      errorDispatch(
        wasDisabling
          ? "Error al deshabilitar el usuario. Por favor, inténtalo de nuevo."
          : "Error al habilitar el usuario. Por favor, inténtalo de nuevo.",
      );
      setShowDisableConfirmation(false);
    }
  };

  const handleDisableCancel = () => {
    setShowDisableConfirmation(false);
  };

  const handleDisableSuccessClose = () => {
    setShowDisableSuccess(false);
    setSelectedUserId(null);
  };

  const handlePlatformAdminClick = () => {
    handleMenuClose();
    setShowPlatformAdminConfirmation(true);
  };

  const handlePlatformAdminConfirm = async () => {
    // As above: the half that applies to this row, not whichever the caller
    // happens to hold. The action also invalidates the current user, so a caller
    // who changed their own flag sees the menu and the route guards follow
    // without a reload.
    if (!selectedPlatformAdminToggle) return;
    const { action, isGranting: wasGrantOperation } = selectedPlatformAdminToggle;

    if (await action.run()) {
      setWasGranted(wasGrantOperation);
      setShowPlatformAdminConfirmation(false);
      setShowPlatformAdminSuccess(true);
    } else {
      errorDispatch("No se pudo actualizar el rol de administrador de plataforma.");
      setShowPlatformAdminConfirmation(false);
    }
  };

  const handlePlatformAdminCancel = () => {
    setShowPlatformAdminConfirmation(false);
  };

  const handlePlatformAdminSuccessClose = () => {
    setShowPlatformAdminSuccess(false);
    setSelectedUserId(null);
  };

  const handleEditClick = () => {
    if (!selectedUser?.id) return;
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
            {/* Mounted only when the backend hands over the action behind it --
                never disabled, which would advertise something the caller cannot
                do. */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {createUser && (
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
              )}
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
                onRowActionsClick={handleMenuOpen}
                hasRowActions={hasRowActions}
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
                    actions: hasRowActions(user) ? (
                      <IconButton
                        aria-label={`Más acciones para ${user.fullName || "el usuario"}`}
                        onClick={(e) => handleMenuOpen(e, user)}
                        sx={sxStyles.touchTarget}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    ) : undefined,
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

      {/* Every item is the selected row's own answer, including when that row is
          the caller's: canDelete, canDisable and canRevokePlatformAdmin are
          documented as always false for the caller themselves, so the self-check
          that used to disable "Revocar" here is the backend's to make. A second
          copy of a rule reads as a rule of its own while proving nothing. */}
      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        {selectedActions.edit && [
          <MenuItem key="edit" onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
            </ListItemIcon>
            <ListItemText>Editar datos</ListItemText>
          </MenuItem>,
          <Divider key="divider" />,
        ]}
        {/* One item per pair, labelled by the operation that applies to this
            row. Rendering the two halves as separate gated items is what put
            Habilitar beside Deshabilitar: both are permitted at once. */}
        {selectedStatusToggle && (
          <MenuItem onClick={handleToggleStatusClick}>
            <ListItemIcon>
              {selectedStatusToggle.isDisabling ? (
                <BlockIcon fontSize="small" sx={{ color: "error.main" }} />
              ) : (
                <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
              )}
            </ListItemIcon>
            <ListItemText sx={{ color: selectedStatusToggle.isDisabling ? "error.main" : "success.main" }}>
              {selectedStatusToggle.isDisabling ? "Deshabilitar" : "Habilitar"}
            </ListItemText>
          </MenuItem>
        )}
        {selectedPlatformAdminToggle && (
          <MenuItem onClick={handlePlatformAdminClick}>
            <ListItemIcon>
              {selectedPlatformAdminToggle.isGranting ? (
                <AddModeratorIcon fontSize="small" sx={{ color: "primary.main" }} />
              ) : (
                <RemoveModeratorIcon fontSize="small" sx={{ color: "error.main" }} />
              )}
            </ListItemIcon>
            <ListItemText sx={{ color: selectedPlatformAdminToggle.isGranting ? "primary.main" : "error.main" }}>
              {selectedPlatformAdminToggle.isGranting
                ? "Conceder admin de plataforma"
                : "Revocar admin de plataforma"}
            </ListItemText>
          </MenuItem>
        )}
      </RowActionsMenu>

      {/* Each confirmation is mounted inside the same gate as the item that
          opens it: a dialog for an action the caller was never given has no way
          to be reached, and no way to be left open across a write that revokes
          it. Which of each pair appears is the half that applies to the row:
          the capability says only whether the caller may ever perform it. */}
      {selectedStatusToggle?.isDisabling && (
        <DisablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUserName}
          onCancel={handleDisableCancel}
          onDisable={handleDisableConfirm}
        />
      )}
      {selectedStatusToggle && !selectedStatusToggle.isDisabling && (
        <EnablePartnerConfirmationModal
          isOpen={showDisableConfirmation}
          partnerName={selectedUserName}
          onCancel={handleDisableCancel}
          onEnable={handleDisableConfirm}
        />
      )}

      <DisablePartnerSuccessModal
        isOpen={showDisableSuccess}
        partnerName={selectedUserName}
        wasEnabled={wasEnabled}
        onClose={handleDisableSuccessClose}
      />

      {selectedPlatformAdminToggle && !selectedPlatformAdminToggle.isGranting && (
        <RevokePlatformAdminConfirmationModal
          isOpen={showPlatformAdminConfirmation}
          userName={selectedUserName}
          isPending={selectedPlatformAdminToggle.action.isPending}
          onCancel={handlePlatformAdminCancel}
          onConfirm={handlePlatformAdminConfirm}
        />
      )}
      {selectedPlatformAdminToggle?.isGranting && (
        <GrantPlatformAdminConfirmationModal
          isOpen={showPlatformAdminConfirmation}
          userName={selectedUserName}
          isPending={selectedPlatformAdminToggle.action.isPending}
          onCancel={handlePlatformAdminCancel}
          onConfirm={handlePlatformAdminConfirm}
        />
      )}

      <PlatformAdminSuccessModal
        isOpen={showPlatformAdminSuccess}
        userName={selectedUserName}
        wasGranted={wasGranted}
        onClose={handlePlatformAdminSuccessClose}
      />
    </Box>
  );
};
