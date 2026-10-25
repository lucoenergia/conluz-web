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
import SendIcon from "@mui/icons-material/Send";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
import {
  platformInvitationWriteMessage,
  revokePlatformAdminRefusal,
  revokePlatformAdminRefusalMessage,
} from "../../errors/platformAdminErrors";
import { MembershipStatusCell, MembershipStatusChip } from "../members/MembershipStatusCell";
import { invitationText } from "../members/membershipStatus";
import { hasAnyOffer, isPendingInvitation, membershipStateOf, platformAdminRowOffer } from "./platformAdminStatus";
import { PlatformInvitationActionDialog, type PlatformInvitationWriteKind } from "./PlatformInvitationActionDialog";
import { InvitePlatformAdminDialog } from "./InvitePlatformAdminDialog";
import { Notice } from "../../components/Notice";
import { inFlightDialogProps } from "../../utils/inFlightDialog";

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
 * A holder's account state, or a pending invitation's state with its link's
 * caption (#288). A pending row's `enabled` is null and never read: it says
 * nothing about the account.
 */
const StateCell: FC<{ admin: PlatformAdminResponse }> = ({ admin }) => {
  const invitation = membershipStateOf(admin);
  return invitation ? <MembershipStatusCell membership={invitation} /> : <StateChip admin={admin} />;
};

const INVITATION_ITEMS: { kind: PlatformInvitationWriteKind; label: string; Icon: typeof SendIcon }[] = [
  { kind: "resend", label: "Reenviar", Icon: SendIcon },
  { kind: "revoke", label: "Revocar enlace", Icon: LinkOffIcon },
];

/**
 * The platform admins, and revoking the role (#285); inviting a person to the
 * role, and the pending invitations, resending them and revoking their links
 * (#288).
 *
 * Read from GET /api/v1/platform-admins only: each row is the admin's own
 * account -- name, email and whether it is enabled -- or a pending invitation,
 * with the name and email the inviter typed and its link's state; nothing
 * about any community or member.
 *
 * What a row offers is decided by whether it has an `invitation`, and each
 * action by its capability: the row capabilities are true on every row, so
 * they cannot tell an invitation from a holder (platformAdminRowOffer).
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

  const { invite, forPlatformAdmin } = usePlatformAdminActions();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCodeShown, setInviteCodeShown] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The user id, not the row: a revoke refetches the list, and the row's
  // `revocable` decides whether its item is enabled, so it is resolved afresh.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  // The invitation write being confirmed, with the name it was opened for: a
  // resend's code must stay on screen even if the refetch that follows it
  // changes or removes the row.
  const [invitationDialog, setInvitationDialog] = useState<{
    kind: PlatformInvitationWriteKind;
    fullName: string;
  } | null>(null);
  const [codeShown, setCodeShown] = useState(false);

  const selectedAdmin = selectedUserId ? (admins.find((admin) => admin.user.id === selectedUserId) ?? null) : null;
  const offerOf = (admin: PlatformAdminResponse) => platformAdminRowOffer(admin, forPlatformAdmin(admin).actions);
  const selectedOffer = selectedAdmin ? offerOf(selectedAdmin) : {};
  const selectedRevoke = selectedOffer.revokeRole;
  const selectedInvitationAction =
    invitationDialog?.kind === "resend"
      ? selectedOffer.resend
      : invitationDialog?.kind === "revoke"
        ? selectedOffer.revokeLink
        : undefined;

  // No permitted action means no menu at all.
  const hasRowActions = (admin: PlatformAdminResponse) => hasAnyOffer(offerOf(admin));

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

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInviteCodeShown(false);
  };

  const closeInvitationDialog = () => {
    setInvitationDialog(null);
    setCodeShown(false);
  };

  // A pending invitation is not a platform admin (ADR-0004): the counters
  // count holders of the role, and the invitations apart.
  const holderCount = admins.filter((admin) => !isPendingInvitation(admin)).length;
  const pendingCount = admins.length - holderCount;
  const enabledCount = admins.filter((admin) => admin.enabled === true).length;

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
        keyFacts={
          pendingCount > 0
            ? [
                { label: "Total", value: holderCount },
                { label: "Habilitados", value: enabledCount },
                { label: "Pendientes", value: pendingCount },
              ]
            : [
                { label: "Total", value: holderCount },
                { label: "Habilitados", value: enabledCount },
              ]
        }
      />

      {invite && (
        <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
          <Paper elevation={0} sx={sxStyles.softPanel}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setInviteDialogOpen(true)}
                sx={{ px: 3, py: 1.5 }}
              >
                Invitar administrador de plataforma
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
              Error al cargar los administradores de plataforma. Por favor, inténtalo de nuevo.
            </Alert>
          ) : (
            <>
              <ResultStatus
                isLoading={isLoading}
                count={holderCount}
                noun={{ one: "administrador de plataforma", other: "administradores de plataforma" }}
                also={{ count: pendingCount, noun: { one: "invitación pendiente", other: "invitaciones pendientes" } }}
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
                      render: (admin) => <StateCell admin={admin} />,
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
                    items={admins.map((admin) => {
                      const invitation = membershipStateOf(admin);
                      const invitationCaption = invitation && invitationText(invitation);
                      return {
                        id: admin.user.id,
                        avatar: (
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: fontSizes.md }}>
                            {initialOf(admin)}
                          </Avatar>
                        ),
                        title: admin.fullName,
                        status: invitation ? <MembershipStatusChip membership={invitation} /> : <StateChip admin={admin} />,
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
                          ...(admin.email ? [{ label: "Email", value: admin.email }] : []),
                          ...(invitationCaption ? [{ label: "Invitación", value: invitationCaption }] : []),
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
        {selectedAdmin &&
          INVITATION_ITEMS.filter(({ kind }) => (kind === "resend" ? selectedOffer.resend : selectedOffer.revokeLink)).map(
            ({ kind, label, Icon }) => (
              <MenuItem
                key={kind}
                onClick={() => {
                  handleMenuClose();
                  setInvitationDialog({ kind, fullName: selectedAdmin.fullName });
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={label} />
              </MenuItem>
            ),
          )}
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
        {...inFlightDialogProps(selectedRevoke?.isPending ?? false, () => setRevokeDialogOpen(false))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Revocar rol de administrador de plataforma</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2">
            ¿Revocar el rol de administrador de plataforma a <strong>{selectedAdmin?.fullName}</strong>?
          </Typography>
          <Notice severity="info">
            Dejará de administrar la plataforma. Su cuenta y las comunidades de las que es miembro no cambian.
          </Notice>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={selectedRevoke?.isPending}>
            Cancelar
          </Button>
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

      {/* Mounted on open, so each opening starts empty; kept while it shows a
          code, which only "Hecho" closes. */}
      {inviteDialogOpen && (inviteCodeShown || invite) && (
        <InvitePlatformAdminDialog
          inviteAdmin={invite}
          onCodeShown={() => setInviteCodeShown(true)}
          onClose={closeInviteDialog}
        />
      )}

      {/* Gated like the item that opens it, so a refetch that takes the action
          away closes it -- except while it shows a code, which only "Hecho"
          closes. */}
      {invitationDialog && (codeShown || selectedInvitationAction) && (
        <PlatformInvitationActionDialog
          kind={invitationDialog.kind}
          fullName={invitationDialog.fullName}
          action={selectedInvitationAction}
          onCodeShown={() => setCodeShown(true)}
          onClose={closeInvitationDialog}
          onRefused={(refusal) => errorDispatch(platformInvitationWriteMessage(refusal, invitationDialog.kind))}
        />
      )}
    </Box>
  );
};
