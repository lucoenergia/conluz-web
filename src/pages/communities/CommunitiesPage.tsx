import { useState, type FC } from "react";
import { Link } from "react-router";
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
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { radii, shadows, colors } from "../../theme/tokens";
import { sxStyles } from "../../theme/sx";
import { BreadCrumb } from "../../components/Breadcrumb";
import { PageHeaderWithStats } from "../../components/PageHeader";
import { useGetAllCommunities } from "../../api/communities/communities";

export const CommunitiesPage: FC = () => {
  const theme = useTheme();
  const { data: communities = [], isLoading, error } = useGetAllCommunities();
  const [notFoundShown] = useState(false);

  const totalActive = communities.filter((c) => c.enabled).length;
  const totalInactive = communities.filter((c) => !c.enabled).length;

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
          {notFoundShown && (
            <Alert severity="info" sx={{ m: 2 }}>
              La creación de comunidades no está habilitada en este servidor.
            </Alert>
          )}
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
                        Estado
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : communities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                            {community.legalId || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: "secondary.main" }}>
                            {community.address || "-"}
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
};
