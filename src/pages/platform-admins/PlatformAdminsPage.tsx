import { useState, type FC } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RemoveModeratorIcon from "@mui/icons-material/RemoveModerator";
import { colors, fontSizes, radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { RecordList } from "../../components/RecordList";
import { ListTable, RowActionsMenu } from "../../components/ListTable";
import { ResultStatus } from "../../components/ResultStatus";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { useGetPlatformAdmins } from "../../api/users/users";
import type { PlatformAdminResponse } from "../../api/models";
import { usePlatformAdminActions } from "../../hooks/actions";
import { usePlatformCapabilities } from "../../hooks/permissions";
import { useErrorDispatch } from "../../context/error.context";
import { revokePlatformAdminRefusal, revokePlatformAdminRefusalMessage } from "../../errors/platformAdminErrors";

const EMPTY_MESSAGE = "No hay administradores de plataforma";
const NOT_REVOCABLE_EXPLANATION = "La plataforma necesita al menos un administrador de plataforma habilitado.";

const initialOf = (admin: PlatformAdminResponse) => admin.fullName.charAt(0).toUpperCase() || "?";

const StateChip: FC<{ admin: PlatformAdminResponse }> = ({ admin }) => (
  <Chip
    label={admin.enabled ? "Habilitado" : "Deshabilitado"}
    color={admin.enabled ? "success" : "error"}
    size="small"
    sx={{ fontWeight: 600 }}
  />
);

/**
 * The platform admins, and revoking the role (#285).
 *
 * Read from GET /api/v1/platform-admins only: each row is the admin's own
 * account -- name, email and whether it is enabled -- and nothing about any
 * community or member. Granting the role is not here: it arrives with the
 * platform-admin invitation.
 *
 * "Revocar rol" reads two answers off the row, and never one for the other:
 * `capabilities.canRevoke` says whether the caller may ever revoke this admin
 * (never their own row), and `revocable` whether the platform would accept it
 * now (never its last enabled admin).
 */
export const PlatformAdminsPage: FC = () => {
  const { width } = useWindowDimensions();
  // Render ONE layout, not two hidden copies: a stacked list below the
  // project's desktop breakpoint, the table above it.
  const isNarrow = width < MIN_DESKTOP_WIDTH;
  const errorDispatch = useErrorDispatch();

  const mayList = usePlatformCapabilities("canListPlatformAdmins");
  const {
    data: admins = [],
    isLoading,
    error,
  } = useGetPlatformAdmins({ query: { enabled: mayList.state === "allowed" } });

  const { forPlatformAdmin } = usePlatformAdminActions();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The user id, not the row: a revoke refetches the list, and the row's
  // `revocable` decides whether its item is enabled, so it is resolved afresh.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const selectedAdmin = selectedUserId ? (admins.find((admin) => admin.user.id === selectedUserId) ?? null) : null;
  const selectedRevoke = selectedAdmin ? forPlatformAdmin(selectedAdmin).actions.revoke : undefined;

  // No permitted action means no menu at all.
  const hasRowActions = (admin: PlatformAdminResponse) => !!forPlatformAdmin(admin).actions.revoke;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, admin: PlatformAdminResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(admin.user.id);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleRevokeConfirm = async () => {
    if (!selectedRevoke) return;
    const result = await selectedRevoke.run();
    setRevokeDialogOpen(false);
    if ("error" in result) {
      errorDispatch(revokePlatformAdminRefusalMessage(revokePlatformAdminRefusal(result.error)));
    }
  };

  const enabledCount = admins.filter((admin) => admin.enabled).length;

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
          { label: "Administradores de plataforma", href: "/platform-admins" },
        ]}
      />

      <DetailHeader
        variant="list"
        icon={<AdminPanelSettingsIcon />}
        title="Administradores de plataforma"
        subtitle="Quién administra la plataforma"
        keyFacts={[
          { label: "Total", value: admins.length },
          { label: "Habilitados", value: enabledCount },
        ]}
      />

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
              Error al cargar los administradores de plataforma. Por favor, inténtalo de nuevo.
            </Alert>
          ) : (
            <>
              <ResultStatus
                isLoading={isLoading}
                count={admins.length}
                noun={{ one: "administrador", other: "administradores" }}
                emptyMessage={EMPTY_MESSAGE}
              />

              {!isNarrow && (
                <ListTable
                  rows={admins}
                  getRowKey={(admin) => admin.user.id}
                  isLoading={isLoading}
                  emptyMessage={EMPTY_MESSAGE}
                  rowActionsLabel={(admin) => `Más acciones para ${admin.fullName}`}
                  onRowActionsClick={handleMenuOpen}
                  hasRowActions={hasRowActions}
                  columns={[
                    {
                      key: "admin",
                      header: "Nombre",
                      render: (admin) => (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                            {initialOf(admin)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {admin.fullName}
                          </Typography>
                        </Box>
                      ),
                    },
                    {
                      key: "email",
                      header: "Correo",
                      // No email, no placeholder: the name identifies them.
                      render: (admin) => admin.email && <Typography variant="body2">{admin.email}</Typography>,
                    },
                    {
                      key: "state",
                      header: "Estado",
                      render: (admin) => <StateChip admin={admin} />,
                    },
                  ]}
                />
              )}

              {isNarrow && (
                <Box sx={{ p: 2 }}>
                  <RecordList
                    label="Administradores de plataforma"
                    isLoading={isLoading}
                    emptyMessage={EMPTY_MESSAGE}
                    items={admins.map((admin) => ({
                      id: admin.user.id,
                      avatar: (
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                          {initialOf(admin)}
                        </Avatar>
                      ),
                      title: admin.fullName,
                      status: <StateChip admin={admin} />,
                      actions: hasRowActions(admin) ? (
                        <IconButton
                          aria-label={`Más acciones para ${admin.fullName}`}
                          onClick={(event) => handleMenuOpen(event, admin)}
                          sx={sxStyles.touchTarget}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : undefined,
                      fields: admin.email ? [{ label: "Email", value: admin.email }] : [],
                    }))}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Box>

      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        {selectedAdmin && selectedRevoke && (
          <MenuItem
            disabled={!selectedAdmin.revocable}
            onClick={() => {
              handleMenuClose();
              setRevokeDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <RemoveModeratorIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            <ListItemText
              primary="Revocar rol"
              secondary={selectedAdmin.revocable ? undefined : NOT_REVOCABLE_EXPLANATION}
              slotProps={{ primary: { sx: { color: "error.main" } }, secondary: { sx: { whiteSpace: "normal" } } }}
            />
          </MenuItem>
        )}
      </RowActionsMenu>

      {/* Gated like the item that opens it: a refetch that makes the row no
          longer revocable, or takes it away, closes the dialog. */}
      <Dialog
        open={revokeDialogOpen && !!selectedRevoke && !!selectedAdmin?.revocable}
        onClose={() => setRevokeDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Revocar rol de administrador de plataforma</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2">
            ¿Revocar el rol de administrador de plataforma a <strong>{selectedAdmin?.fullName}</strong>?
          </Typography>
          <Alert severity="info">
            Dejará de administrar la plataforma. Su cuenta y las comunidades de las que es miembro no cambian.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRevokeConfirm}
            disabled={selectedRevoke?.isPending}
          >
            Revocar rol
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
