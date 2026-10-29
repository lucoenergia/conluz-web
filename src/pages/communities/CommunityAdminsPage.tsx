import { useState, type FC } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Avatar,
  Box,
  Button,
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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { colors, fontSizes, radii, shadows } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { RecordList } from "../../components/RecordList";
import { ListTable, RowActionsMenu } from "../../components/ListTable";
import { ResultStatus } from "../../components/ResultStatus";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import { CommunityScopeHeader } from "../../components/CommunityScopeHeader";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { useGetCommunityById } from "../../api/communities/communities";
import { useGetCommunityAdmins } from "../../api/memberships/memberships";
import type { CommunityAdminResponse } from "../../api/models";
import { useCommunityActions } from "../../hooks/actions";
import { outcomeFromResource } from "../../hooks/permissions";
import { communityLabel } from "../../hooks/useActiveCommunityName";
import { useErrorDispatch } from "../../context/error.context";
import { invitationRefusalMessage } from "../../errors/membershipErrors";
import { InvitationActionDialog } from "../members/InvitationActionDialog";
import { invitationActionsFor, membershipStatusOf, statusToggleFor } from "../members/membershipStatus";
import { MembershipStatusChip } from "../members/MembershipStatusChip";
import { InviteAdminDialog } from "./InviteAdminDialog";
import { Notice } from "../../components/Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";

type AdminInvitationWrite = "resend" | "revoke";

const INVITATION_ITEMS: { kind: AdminInvitationWrite; label: string }[] = [
  { kind: "resend", label: "Reenviar" },
  { kind: "revoke", label: "Revocar enlace" },
];

const initialOf = (admin: CommunityAdminResponse) => admin.fullName.charAt(0).toUpperCase() || "?";

/**
 * A community's admins, for the platform admin (#276): who they are, where
 * their membership and invitation stand, and the writes that move them. Read
 * from the community's admin endpoints only -- never the roster, which is the
 * community's own business -- and gated, entry, list and every action alike, on
 * the community's canManageAdmins.
 */
export const CommunityAdminsPage: FC = () => {
  const { communityId = "" } = useParams();
  const { width } = useWindowDimensions();
  // Render ONE layout, not two hidden copies: a stacked list below the
  // project's desktop breakpoint, the table above it.
  const isNarrow = width < MIN_DESKTOP_WIDTH;
  const errorDispatch = useErrorDispatch();

  // The same query the route guard asked, so it is already in the cache.
  const { data: communityData } = useGetCommunityById(communityId);
  const communityName = communityData?.name;
  const community = communityLabel(communityName);
  const manageAdmins = outcomeFromResource(communityData?.capabilities, "canManageAdmins");

  const {
    data: admins = [],
    isLoading,
    error,
  } = useGetCommunityAdmins(communityId, { query: { enabled: manageAdmins.state === "allowed" } });

  const { forCommunity, forCommunityAdmin } = useCommunityActions();
  const { inviteAdmin } = forCommunity(communityData).actions;

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The user id, not the row: a write invalidates the list, and the row's state
  // decides what its menu offers, so it is resolved afresh on every render.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [invitationDialog, setInvitationDialog] = useState<AdminInvitationWrite | null>(null);

  const selectedAdmin = selectedUserId ? (admins.find((admin) => admin.user.id === selectedUserId) ?? null) : null;
  const rowActionsOf = (admin: CommunityAdminResponse | null) =>
    forCommunityAdmin(communityData, admin ?? undefined).actions;
  const selectedActions = rowActionsOf(selectedAdmin);
  const selectedStatusToggle = statusToggleFor(selectedAdmin, selectedActions);
  const selectedInvitationActions = invitationActionsFor(selectedAdmin, selectedActions);
  const selectedInvitationAction = invitationDialog ? selectedInvitationActions[invitationDialog] : undefined;

  // No permitted action means no menu at all.
  const hasRowActions = (admin: CommunityAdminResponse) => {
    const actions = rowActionsOf(admin);
    return !!statusToggleFor(admin, actions) || Object.values(invitationActionsFor(admin, actions)).some(Boolean);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, admin: CommunityAdminResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(admin.user.id);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleStatusConfirm = async () => {
    if (!selectedStatusToggle) return;
    const { action, isSuspending } = selectedStatusToggle;
    if (await action.run()) {
      setStatusDialogOpen(false);
    } else {
      errorDispatch(
        isSuspending
          ? "No se ha podido suspender al administrador. Inténtalo de nuevo."
          : "No se ha podido reactivar al administrador. Inténtalo de nuevo.",
      );
    }
  };

  const activeCount = admins.filter((admin) => membershipStatusOf(admin).status === "active").length;
  const pendingCount = admins.filter((admin) => membershipStatusOf(admin).status === "pending").length;

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
          { label: "Comunidades", href: "/communities" },
          { label: "Administradores", href: `/communities/${communityId}/admins` },
        ]}
      />

      <DetailHeader
        variant="list"
        icon={<AdminPanelSettingsIcon />}
        title={`Administradores de ${community}`}
        subtitle="Invita a quienes administran la comunidad y gestiona su acceso"
        keyFacts={[
          { label: "Total", value: admins.length },
          { label: "Activos", value: activeCount },
          { label: "Pendientes", value: pendingCount },
        ]}
      />

      {inviteAdmin && (
        <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
          <Paper elevation={0} sx={sxStyles.softPanel}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setInviteDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Invitar administrador
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

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
              Error al cargar los administradores. Por favor, inténtalo de nuevo.
            </Alert>
          ) : (
            <>
              <ResultStatus
                isLoading={isLoading}
                count={admins.length}
                noun={{ one: "administrador", other: "administradores" }}
                emptyMessage="Esta comunidad no tiene administradores"
              />

              {!isNarrow && (
                <ListTable
                  rows={admins}
                  getRowKey={(admin) => admin.user.id}
                  isLoading={isLoading}
                  emptyMessage="Esta comunidad no tiene administradores"
                  rowActionsLabel={(admin) => `Más acciones para ${admin.fullName}`}
                  onRowActionsClick={handleMenuOpen}
                  hasRowActions={hasRowActions}
                  columns={[
                    {
                      key: "admin",
                      header: "Administrador",
                      render: (admin) => (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                            {initialOf(admin)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {admin.fullName}
                            </Typography>
                            {admin.contactEmail && (
                              <Typography variant="caption" sx={{ color: colors.text.subtle }}>
                                {admin.contactEmail}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ),
                    },
                    {
                      key: "personalId",
                      header: "DNI/NIE",
                      render: (admin) => <Typography variant="body2">{admin.personalId}</Typography>,
                    },
                    {
                      key: "phone",
                      header: "Teléfono",
                      render: (admin) => <Typography variant="body2">{admin.phoneNumber ?? "—"}</Typography>,
                    },
                    {
                      key: "status",
                      header: "Estado",
                      render: (admin) => <MembershipStatusChip membership={admin} />,
                    },
                  ]}
                />
              )}

              {isNarrow && (
                <Box sx={{ p: 2 }}>
                  <RecordList
                    label="Administradores de la comunidad"
                    isLoading={isLoading}
                    emptyMessage="Esta comunidad no tiene administradores"
                    items={admins.map((admin) => {
                      return {
                        id: admin.user.id,
                        avatar: (
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                            {initialOf(admin)}
                          </Avatar>
                        ),
                        title: admin.fullName,
                        status: <MembershipStatusChip membership={admin} />,
                        actions: hasRowActions(admin) ? (
                          <IconButton
                            aria-label={`Más acciones para ${admin.fullName}`}
                            onClick={(event) => handleMenuOpen(event, admin)}
                            sx={sxStyles.touchTarget}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        ) : undefined,
                        fields: [
                          { label: "DNI/NIE", value: admin.personalId },
                          ...(admin.contactEmail ? [{ label: "Email", value: admin.contactEmail }] : []),
                          ...(admin.phoneNumber ? [{ label: "Teléfono", value: admin.phoneNumber }] : []),
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

      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        {INVITATION_ITEMS.filter(({ kind }) => selectedInvitationActions[kind]).map(({ kind, label }) => (
          <MenuItem
            key={kind}
            onClick={() => {
              handleMenuClose();
              setInvitationDialog(kind);
            }}
          >
            <ListItemIcon>
              {kind === "resend" && <SendIcon fontSize="small" sx={{ color: "primary.main" }} />}
              {kind === "revoke" && <LinkOffIcon fontSize="small" sx={{ color: "primary.main" }} />}
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}
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
      </RowActionsMenu>

      {/* Mounted with the button that opens it, and on open, so each opening starts afresh. */}
      {inviteDialogOpen && inviteAdmin && (
        <InviteAdminDialog
          communityName={communityName}
          inviteAdmin={inviteAdmin}
          onClose={() => setInviteDialogOpen(false)}
        />
      )}

      {/* Mounted only while the row grants the write in its current state, so a
          refetch that changes the state closes it. */}
      {invitationDialog && selectedAdmin && selectedInvitationAction && (
        <InvitationActionDialog
          kind={invitationDialog}
          memberName={selectedAdmin.fullName}
          communityName={communityName}
          action={selectedInvitationAction}
          onClose={() => setInvitationDialog(null)}
          onRefused={(refusal) => errorDispatch(invitationRefusalMessage(refusal, invitationDialog, "admin"))}
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
          {selectedStatusToggle?.isSuspending ? "Suspender administrador en" : "Reactivar administrador en"}{" "}
          {community}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2">
            {selectedStatusToggle?.isSuspending ? "¿Suspender a " : "¿Reactivar a "}
            <strong>{selectedAdmin?.fullName ?? "este administrador"}</strong> como administrador de {community}?
          </Typography>
          <Notice severity="info">
            {selectedStatusToggle?.isSuspending
              ? `Mientras esté suspendido, no podrá acceder a ${community}. Su cuenta y su acceso a otras comunidades no cambian.`
              : `Volverá a tener acceso a ${community} como administrador.`}
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
    </Box>
  );
};
