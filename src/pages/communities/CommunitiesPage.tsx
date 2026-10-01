import { useState, type FC } from "react";
import { Link, useNavigate } from "react-router";
import { useTheme, alpha } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  IconButton,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import { radii, shadows, colors, fontSizes, interactiveTransition, motion} from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { RecordList } from "../../components/RecordList";
import { ListTable, ListTableHeaderText, RowActionsMenu } from "../../components/ListTable";
import { ResultStatus } from "../../components/ResultStatus";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import { useGetAllCommunities } from "../../api/communities/communities";
import type { CommunityResponse } from "../../api/models";
import { useCommunityActions, usePlatformActions } from "../../hooks/actions";
import { Can, outcomeFromResource } from "../../hooks/permissions";
import { ManageAdminsDialog } from "./ManageAdminsDialog";

const MAX_ADMIN_NAMES_SHOWN = 2;

function AdminNamesCell({ adminNames }: { adminNames?: string[] }) {
  if (!adminNames || adminNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: colors.text.subtle }}>
        —
      </Typography>
    );
  }
  const shown = adminNames.slice(0, MAX_ADMIN_NAMES_SHOWN);
  const overflow = adminNames.length - MAX_ADMIN_NAMES_SHOWN;
  return (
    <Typography variant="body2" sx={{ color: "secondary.main" }}>
      {shown.join(", ")}
      {overflow > 0 && (
        <Typography component="span" variant="body2" sx={{ color: colors.text.subtle }}>
          {" "}y {overflow} más
        </Typography>
      )}
    </Typography>
  );
}

export const CommunitiesPage: FC = () => {
  const { width } = useWindowDimensions();
  // Render ONE layout, not two hidden copies: a stacked list below the
  // project's desktop breakpoint, the table above it.
  const isNarrow = width < MIN_DESKTOP_WIDTH;

  const theme = useTheme();
  const navigate = useNavigate();
  const { data: communities = [], isLoading, error } = useGetAllCommunities();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // The id, not the row. A write invalidates the list, so a stored row would go
  // on answering from before the change -- and it is that row's capabilities
  // that now decide what its menu offers.
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  // What this caller may do, as the backend answers it. forCommunity is a plain
  // function rather than a hook precisely so it can be asked once per row, and
  // it takes the row's community rather than the active one -- administering a
  // community is not working in it.
  const { forCommunity } = useCommunityActions();
  const { createCommunity } = usePlatformActions().actions;

  const totalActive = communities.filter((c) => c.enabled).length;
  const totalInactive = communities.filter((c) => !c.enabled).length;

  // Resolved from the list on every render rather than stored, so the row the
  // menu and its dialog act on is the one the cache currently holds.
  const selectedCommunity = selectedCommunityId
    ? (communities.find((community) => community.id === selectedCommunityId) ?? null)
    : null;

  // Managing a community's admins is its canManageMemberships. The menu item
  // opens a dialog rather than performing the write itself, so it reads the
  // capability directly; the writes inside the dialog come from the actions
  // layer.
  const rowAdmins = (community: CommunityResponse | null) =>
    outcomeFromResource(community?.capabilities, "canManageMemberships");

  // No permitted action means no menu at all, rather than a menu with nothing
  // in it or items the backend would refuse.
  const hasRowActions = (community: CommunityResponse) =>
    !!forCommunity(community).actions.update || rowAdmins(community).state === "allowed";

  const selectedUpdate = forCommunity(selectedCommunity ?? undefined).actions.update;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, community: CommunityResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedCommunityId(community.id ?? null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    if (selectedCommunity?.id) {
      navigate(`/communities/${selectedCommunity.id}/edit`);
    }
  };

  const handleManageAdminsClick = () => {
    handleMenuClose();
    setAdminDialogOpen(true);
  };

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
        ]}
      />

      <DetailHeader
        variant="list"
        icon={<BusinessIcon />}
        title="Gestión de Comunidades"
        subtitle="Administra las comunidades energéticas de la plataforma"
        keyFacts={[
          { label: "Total", value: communities.length },
          { label: "Activas", value: totalActive },
          { label: "Inactivas", value: totalInactive },
        ]}
      />

      <Box sx={[sxStyles.pageContainerFull, { boxSizing: "border-box" }]}>
        <Paper elevation={0} sx={sxStyles.softPanel}>
          {/* Mounted only when the backend hands over the action behind it --
              never disabled, which would advertise something the caller cannot
              do. */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            {createCommunity && (
            <Button
              component={Link}
              to="/communities/new"
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
              Nueva Comunidad
            </Button>
            )}
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
              Error al cargar las comunidades. Por favor, intente de nuevo.
            </Alert>
          ) : (
            <>
            <ResultStatus
              isLoading={isLoading}
              count={communities.length}
              noun={{ one: "comunidad", other: "comunidades" }}
              emptyMessage="No se encontraron comunidades"
            />

            {!isNarrow && (
            <ListTable
              rows={communities}
              getRowKey={(community) => community.id}
              isLoading={isLoading}
              emptyMessage="No hay comunidades registradas"
              rowActionsLabel={(community) => `Más acciones para ${community.name || "la comunidad"}`}
              onRowActionsClick={handleMenuOpen}
              hasRowActions={hasRowActions}
              columns={[
                {
                  key: "name",
                  header: "Nombre",
                  render: (community) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {community.name}
                      </Typography>
                    </Box>
                  ),
                },
                {
                  key: "code",
                  header: "Código",
                  render: (community) => (
                    <Typography variant="body2" sx={{ color: "secondary.main", fontFamily: "monospace" }}>
                      {community.code}
                    </Typography>
                  ),
                },
                {
                  key: "legalId",
                  header: "NIF/CIF",
                  render: (community) => (
                    <Typography variant="body2" sx={{ color: "secondary.main" }}>
                      {community.legalId || "—"}
                    </Typography>
                  ),
                },
                {
                  key: "address",
                  header: "Dirección",
                  render: (community) => (
                    <Typography variant="body2" sx={{ color: "secondary.main" }}>
                      {community.address || "—"}
                    </Typography>
                  ),
                },
                {
                  key: "admins",
                  header: "Administradores",
                  render: (community) => <AdminNamesCell adminNames={community.adminNames} />,
                },
                {
                  key: "memberCount",
                  header: (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                      <PeopleIcon sx={{ fontSize: fontSizes.md, color: "secondary.main" }} />
                      <ListTableHeaderText>Miembros</ListTableHeaderText>
                    </Box>
                  ),
                  align: "center",
                  render: (community) => (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      {community.memberCount ?? "—"}
                    </Typography>
                  ),
                },
                {
                  key: "supplyPointCount",
                  header: (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                      <ElectricBoltIcon sx={{ fontSize: fontSizes.md, color: "secondary.main" }} />
                      <ListTableHeaderText>Suministros</ListTableHeaderText>
                    </Box>
                  ),
                  align: "center",
                  render: (community) => (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                      {community.supplyPointCount ?? "—"}
                    </Typography>
                  ),
                },
                {
                  key: "status",
                  header: "Estado",
                  render: (community) => (
                    <Chip
                      label={community.enabled ? "Activa" : "Inactiva"}
                      color={community.enabled ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ),
                },
              ]}
            />
            )}

            {isNarrow && (
            <Box sx={{ p: 2 }}>
              <RecordList
                label="Comunidades"
                isLoading={isLoading}
                emptyMessage="No se encontraron comunidades"
                items={communities.map((community) => ({
                  id: String(community.id ?? ""),
                  avatar: <BusinessIcon sx={{ color: "primary.main", fontSize: 20, mt: 0.5 }} />,
                  title: community.name || "Sin nombre",
                  status: (
                    <Chip
                      label={community.enabled ? "Activa" : "Inactiva"}
                      color={community.enabled ? "success" : "error"}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ),
                  actions: hasRowActions(community) ? (
                    <IconButton
                      aria-label={`Más acciones para ${community.name || "la comunidad"}`}
                      onClick={(e) => handleMenuOpen(e, community)}
                      sx={sxStyles.touchTarget}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  ) : undefined,
                  fields: [
                    { label: "Código", value: community.code || "—" },
                    { label: "CIF", value: community.legalId || "—" },
                    { label: "Dirección", value: community.address || "—" },
                    { label: "Admins", value: <AdminNamesCell adminNames={community.adminNames} /> },
                    { label: "Socios", value: community.memberCount ?? "—" },
                    { label: "Suministros", value: community.supplyPointCount ?? "—" },
                  ],
                }))}
              />
            </Box>
            )}
            </>
          )}
        </Paper>
      </Box>

      {/* Every item is the selected row's own answer. Editing is the
          community's canUpdate, a platform-wide decision that being its admin
          does not confer; managing its admins is canManageMemberships, which a
          community admin does have. The two differ, so they are asked
          separately. */}
      <RowActionsMenu anchorEl={anchorEl} onClose={handleMenuClose}>
        {selectedUpdate && (
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}
        <Can outcome={rowAdmins(selectedCommunity)}>
          <MenuItem onClick={handleManageAdminsClick}>
            <ListItemIcon>
              <AdminPanelSettingsIcon fontSize="small" sx={{ color: "primary.main" }} />
            </ListItemIcon>
            <ListItemText>Gestionar administradores</ListItemText>
          </MenuItem>
        </Can>
      </RowActionsMenu>

      {/* Mounted inside the same gate as the item that opens it: a dialog for an
          action the caller was never given has no way to be reached. */}
      <ManageAdminsDialog
        community={selectedCommunity}
        open={adminDialogOpen && rowAdmins(selectedCommunity).state === "allowed"}
        onClose={() => setAdminDialogOpen(false)}
      />
    </Box>
  );
};
