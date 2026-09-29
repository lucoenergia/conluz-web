import { useState, type FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { colors } from "../../theme/tokens";
import type { CommunityResponse } from "../../api/models";
import { useGetMemberships } from "../../api/memberships/memberships";
import { useGetAllUsers } from "../../api/users/users";
import {
  MembershipResponseRole,
  CreateMembershipBodyRole,
  UpdateMembershipRoleBodyRole,
} from "../../api/models";
import { useMembershipActions } from "../../hooks/actions";
import { useErrorDispatch } from "../../context/error.context";

interface Props {
  community: CommunityResponse | null;
  open: boolean;
  onClose: () => void;
}

export const ManageAdminsDialog: FC<Props> = ({ community, open, onClose }) => {
  const errorDispatch = useErrorDispatch();
  const [selectedUserId, setSelectedUserId] = useState("");
  // The user id, not the membership. A write invalidates the roster, so a stored
  // row would go on answering from before the change.
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(null);

  const communityId = community?.id ?? "";

  const { data: memberships = [], isLoading: membershipsLoading } = useGetMemberships(communityId, {
    query: { enabled: open && !!communityId },
  });

  const { data: allUsersData } = useGetAllUsers({ size: 10000 });

  // The community carries the answer for adding somebody, each membership for
  // changing or removing its own. forMembership is a plain function rather than
  // a hook precisely so it can be asked once per row.
  const { actions: membershipActions, forMembership } = useMembershipActions(community ?? undefined);
  const { add } = membershipActions;

  const adminMemberships = memberships.filter(
    (m) => m.role === MembershipResponseRole.COMMUNITY_ADMIN,
  );
  const adminUserIds = new Set(adminMemberships.map((m) => m.user?.id).filter(Boolean));
  const membershipByUserId = new Map(
    memberships.flatMap((m) => (m.user?.id ? [[m.user.id, m] as const] : [])),
  );

  /**
   * Assigning is two different writes answering to two different capabilities:
   * promoting somebody already in the community is that membership's
   * canUpdateRole, while adding somebody who is not in it yet is the community's
   * canManageMemberships. A user the backend would refuse is left out of the
   * list rather than offered and refused on submit.
   */
  const assignableUsers = (allUsersData?.items ?? []).filter((user) => {
    if (!user.id || adminUserIds.has(user.id)) return false;
    const existing = membershipByUserId.get(user.id);
    return existing ? !!forMembership(existing).actions.changeRole : !!add;
  });

  const selectedMembership = selectedUserId ? membershipByUserId.get(selectedUserId) : undefined;
  const assignAction = !selectedUserId
    ? undefined
    : selectedMembership
      ? forMembership(selectedMembership).actions.changeRole
      : add;

  const removeTarget = removeConfirmUserId ? membershipByUserId.get(removeConfirmUserId) : undefined;
  const removeTargetRemove = forMembership(removeTarget).actions.remove;

  const handleAssign = async () => {
    if (!selectedUserId) return;
    const existing = membershipByUserId.get(selectedUserId);
    const assigned = existing
      ? await forMembership(existing).actions.changeRole?.run({
          role: UpdateMembershipRoleBodyRole.COMMUNITY_ADMIN,
        })
      : await add?.run({
          userId: selectedUserId,
          role: CreateMembershipBodyRole.COMMUNITY_ADMIN,
        });

    // `undefined` is "no such action", which the disabled button already covers.
    if (assigned === undefined) return;
    if (assigned) {
      setSelectedUserId("");
    } else {
      errorDispatch("Error al asignar el administrador. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRemove = async (userId: string) => {
    const remove = forMembership(membershipByUserId.get(userId)).actions.remove;
    if (!remove) return;
    if (await remove.run()) {
      setRemoveConfirmUserId(null);
    } else {
      errorDispatch("Error al eliminar el administrador. Por favor, inténtalo de nuevo.");
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setRemoveConfirmUserId(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="span">
            Gestionar administradores
          </Typography>
          {community?.name && (
            <Typography variant="body2" sx={{ color: colors.text.subtle, mt: 0.5 }}>
              {community.name}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Administradores actuales
          </Typography>

          {membershipsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : adminMemberships.length === 0 ? (
            <Typography variant="body2" sx={{ color: colors.text.subtle, mb: 2 }}>
              Esta comunidad no tiene administradores asignados.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ mb: 2 }}>
              {adminMemberships.map((membership) => {
                // Destructured so TypeScript narrows it: an action the caller was
                // not given is undefined, and the row is handed nothing.
                const { remove } = forMembership(membership).actions;
                return (
                  <ListItem
                    key={membership.id}
                    divider
                    sx={{ px: 0 }}
                    secondaryAction={
                      remove && (
                        <Tooltip title="Eliminar administrador">
                          <span>
                            <IconButton
                              edge="end"
                              size="small"
                              aria-label={`Eliminar administrador ${membership.user?.fullName ?? ""}`.trim()}
                              disabled={remove.isPending}
                              onClick={() =>
                                membership.user?.id && setRemoveConfirmUserId(membership.user.id)
                              }
                              sx={{ color: colors.error.main }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )
                    }
                  >
                    <ListItemText
                      primary={membership.user?.fullName ?? membership.user?.email ?? "—"}
                      secondary={membership.user?.email}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}

          {/* Mounted only when somebody could actually be assigned: with no
              candidate the backend would accept, the control is an invitation
              the caller can only fail to follow. */}
          {assignableUsers.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Asignar nuevo administrador
              </Typography>

              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Usuario</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Usuario"
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    {assignableUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.fullName ?? u.email ?? u.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  disabled={!assignAction || assignAction.isPending}
                  onClick={handleAssign}
                  sx={{ whiteSpace: "nowrap", py: 1 }}
                >
                  Asignar
                </Button>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Removing an administrator used to happen on the first click of a
          tooltipped icon, with nothing in between. It changes who can administer
          a community, so it asks first, like every other state-changing action
          in the app. Gated like the button that opens it. */}
      <Dialog
        open={!!removeConfirmUserId && !!removeTargetRemove}
        onClose={() => setRemoveConfirmUserId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Retirar a{" "}
            <strong>
              {removeTarget?.user?.fullName ?? removeTarget?.user?.email ?? "este administrador"}
            </strong>{" "}
            de la administración de {community?.name ?? "la comunidad"}? Dejará de pertenecer a la
            comunidad.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRemoveConfirmUserId(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => removeConfirmUserId && handleRemove(removeConfirmUserId)}
            disabled={removeTargetRemove?.isPending}
          >
            {removeTargetRemove?.isPending ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
