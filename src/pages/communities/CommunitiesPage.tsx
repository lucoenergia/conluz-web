import { useState, type FC } from "react";
import { Link, useNavigate } from "react-router";
import { useTheme, alpha } from "@mui/material/styles";
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
  IconButton,
  Menu,
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
import { ResultStatus } from "../../components/ResultStatus";
import useWindowDimensions from "../../utils/useWindowDimensions";
import { MIN_DESKTOP_WIDTH } from "../../utils/constants";
import { BreadCrumb } from "../../components/Breadcrumb";
import { DetailHeader } from "../../components/DetailHeader";
import { useGetAllCommunities } from "../../api/communities/communities";
import type { CommunityResponse } from "../../api/models";
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
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityResponse | null>(null);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const totalActive = communities.filter((c) => c.enabled).length;
  const totalInactive = communities.filter((c) => !c.enabled).length;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, community: CommunityResponse) => {
    setAnchorEl(event.currentTarget);
    setSelectedCommunity(community);
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
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.background.surface }}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Nombre
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Código
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        NIF/CIF
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Dirección
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                        Administradores
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                        <PeopleIcon sx={{ fontSize: fontSizes.md, color: "secondary.main" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                          Miembros
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "center" }}>
                        <ElectricBoltIcon sx={{ fontSize: fontSizes.md, color: "secondary.main" }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                          Suministros
                        </Typography>
                      </Box>
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
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : communities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          No hay comunidades registradas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    communities.map((community) => (
                      <TableRow
                        key={community.id}
                        sx={{
                          "&:hover": { backgroundColor: colors.background.surface },
                          transition: "background-color 0.2s",
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <BusinessIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {community.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "secondary.main", fontFamily: "monospace" }}>
                            {community.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "secondary.main" }}>
                            {community.legalId || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "secondary.main" }}>
                            {community.address || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <AdminNamesCell adminNames={community.adminNames} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                            {community.memberCount ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "secondary.main" }}>
                            {community.supplyPointCount ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={community.enabled ? "Activa" : "Inactiva"}
                            color={community.enabled ? "success" : "error"}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            aria-label={`Más acciones para ${community.name || "la comunidad"}`}
                            onClick={(e) => handleMenuOpen(e, community)}
                            sx={{ color: colors.text.subtle }}
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
                  actions: (
                    <IconButton
                      aria-label={`Más acciones para ${community.name || "la comunidad"}`}
                      onClick={(e) => handleMenuOpen(e, community)}
                      sx={sxStyles.touchTarget}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  ),
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

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleManageAdminsClick}>
          <ListItemIcon>
            <AdminPanelSettingsIcon fontSize="small" sx={{ color: "primary.main" }} />
          </ListItemIcon>
          <ListItemText>Gestionar administradores</ListItemText>
        </MenuItem>
      </Menu>

      <ManageAdminsDialog
        community={selectedCommunity}
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
      />
    </Box>
  );
};
