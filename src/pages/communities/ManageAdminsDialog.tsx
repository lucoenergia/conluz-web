import { useState, type FC } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  MembershipResponseRole,
  CreateMembershipBodyRole,
  UpdateMembershipRoleBodyRole,
} from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";

interface Props {
  community: CommunityResponse | null;
  open: boolean;
  onClose: () => void;
}

export const ManageAdminsDialog: FC<Props> = ({ community, open, onClose }) => {
  const queryClient = useQueryClient();
  const errorDispatch = useErrorDispatch();
  const [selectedUserId, setSelectedUserId] = useState("");

  const communityId = community?.id ?? "";

  const { data: memberships = [], isLoading: membershipsLoading } = useGetMemberships(communityId, {
    query: { enabled: open && !!communityId },
  });

  const { data: allUsersData } = useGetAllUsers({ size: 10000 });

  const createMembership = useCreateMembership();
  const deleteMembership = useDeleteMembership();
  const updateRole = useUpdateMembershipRole();

  const adminMemberships = memberships.filter(
    (m) => m.role === MembershipResponseRole.COMMUNITY_ADMIN,
  );
  const adminUserIds = new Set(adminMemberships.map((m) => m.user?.id).filter(Boolean));

  const availableUsers =
    allUsersData?.items?.filter((u) => u.id && !adminUserIds.has(u.id)) ?? [];

  const isMutating =
    createMembership.isPending || deleteMembership.isPending || updateRole.isPending;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetMembershipsQueryKey(communityId) });
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
  };

  const handleAssign = async () => {
    if (!selectedUserId || !communityId) return;
    try {
      const existingMembership = memberships.find((m) => m.user?.id === selectedUserId);
      if (existingMembership) {
        await updateRole.mutateAsync({
          id: communityId,
          userId: selectedUserId,
          data: { role: UpdateMembershipRoleBodyRole.COMMUNITY_ADMIN },
        });
      } else {
        await createMembership.mutateAsync({
          id: communityId,
          data: { userId: selectedUserId, role: CreateMembershipBodyRole.COMMUNITY_ADMIN },
        });
      }
      setSelectedUserId("");
      invalidate();
    } catch {
      errorDispatch("Error al asignar el administrador. Por favor, inténtalo de nuevo.");
    }
  };

  const handleRemove = async (userId: string) => {
    if (!communityId) return;
    try {
      await deleteMembership.mutateAsync({ id: communityId, userId });
      invalidate();
    } catch {
      errorDispatch("Error al eliminar el administrador. Por favor, inténtalo de nuevo.");
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    onClose();
  };

  return (
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
            {adminMemberships.map((membership) => (
              <ListItem
                key={membership.id}
                divider
                sx={{ px: 0 }}
                secondaryAction={
                  <Tooltip title="Eliminar administrador">
                    <span>
                      <IconButton
                        edge="end"
                        size="small"
                        disabled={isMutating}
                        onClick={() => membership.user?.id && handleRemove(membership.user.id)}
                        sx={{ color: colors.error.main }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={membership.user?.fullName ?? membership.user?.email ?? "—"}
                  secondary={membership.user?.email}
                />
              </ListItem>
            ))}
          </List>
        )}

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
              disabled={isMutating}
            >
              {availableUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.fullName ?? u.email ?? u.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            disabled={!selectedUserId || isMutating}
            onClick={handleAssign}
            sx={{ whiteSpace: "nowrap", py: 1 }}
          >
            Asignar
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
