import { useState, type FC } from "react";
import { Link } from "react-router";
import { useTheme, alpha } from "@mui/material/styles";
import { useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PeopleIcon from "@mui/icons-material/People";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import { radii, shadows, colors, fontSizes } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PageHeaderWithStats } from "../../components/PageHeader";
import {
  useGetAllCommunities,
  useUpdateCommunity,
  getGetAllCommunitiesQueryKey,
} from "../../api/communities/communities";
import type { CommunityResponse, UpdateCommunityBody } from "../../api/models";
import { useErrorDispatch } from "../../context/error.context";

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

interface EditDialogProps {
  community: CommunityResponse;
  onClose: () => void;
  onSaved: () => void;
}

const EditCommunityDialog: FC<EditDialogProps> = ({ community, onClose, onSaved }) => {
  const errorDispatch = useErrorDispatch();
  const updateCommunity = useUpdateCommunity();

  const [name, setName] = useState(community.name ?? "");
  const [code, setCode] = useState(community.code ?? "");
  const [legalId, setLegalId] = useState(community.legalId ?? "");
  const [address, setAddress] = useState(community.address ?? "");
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");

  const validate = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError("El nombre es obligatorio");
      valid = false;
    } else {
      setNameError("");
    }
    if (!code.trim()) {
      setCodeError("El código es obligatorio");
      valid = false;
    } else {
      setCodeError("");
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate() || !community.id) return;
    try {
      await updateCommunity.mutateAsync({
        id: community.id,
        data: {
          name: name.trim(),
          code: code.trim(),
          legalId: legalId.trim() || undefined,
          address: address.trim() || undefined,
        } as UpdateCommunityBody,
      });
      onSaved();
    } catch {
      errorDispatch("Error al actualizar la comunidad. Por favor, inténtalo de nuevo.");
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar comunidad</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField
          label="Nombre *"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!nameError}
          helperText={nameError}
        />
        <TextField
          label="Código *"
          fullWidth
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={!!codeError}
          helperText={codeError || "Identificador corto único para la comunidad"}
        />
        <TextField
          label="NIF/CIF"
          fullWidth
          value={legalId}
          onChange={(e) => setLegalId(e.target.value)}
        />
        <TextField
          label="Dirección"
          fullWidth
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={updateCommunity.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={updateCommunity.isPending}
        >
          {updateCommunity.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const CommunitiesPage: FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: communities = [], isLoading, error } = useGetAllCommunities();
  const [editingCommunity, setEditingCommunity] = useState<CommunityResponse | null>(null);

  const totalActive = communities.filter((c) => c.enabled).length;
  const totalInactive = communities.filter((c) => !c.enabled).length;

  const handleEditSaved = () => {
    setEditingCommunity(null);
    queryClient.invalidateQueries({ queryKey: getGetAllCommunitiesQueryKey() });
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

      <PageHeaderWithStats
        icon={BusinessIcon}
        title="Gestión de Comunidades"
        subtitle="Administra las comunidades energéticas de la plataforma"
        stats={[
          { value: communities.length, label: "Total" },
          { value: totalActive, label: "Activas", color: colors.success },
          { value: totalInactive, label: "Inactivas", color: colors.error.main },
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
                  transform: "translateY(-2px)",
                  boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                },
                transition: "all 0.3s ease",
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
                          <Tooltip title="Editar comunidad">
                            <IconButton
                              size="small"
                              onClick={() => setEditingCommunity(community)}
                              sx={{ color: theme.palette.primary.main }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {editingCommunity && (
        <EditCommunityDialog
          community={editingCommunity}
          onClose={() => setEditingCommunity(null)}
          onSaved={handleEditSaved}
        />
      )}
    </Box>
  );
};
