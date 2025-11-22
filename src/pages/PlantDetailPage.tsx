import { useEffect, type FC } from "react";
import { Box, Paper, Typography, Grid, Chip, Avatar, Button } from "@mui/material";
import { useParams, useNavigate, Link } from "react-router";
import { BreadCrumb } from "../components/Breadcrumb";
import { useGetPlantById } from "../api/plants/plants";
import { useErrorDispatch } from "../context/error.context";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import BoltIcon from "@mui/icons-material/Bolt";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BusinessIcon from "@mui/icons-material/Business";

export const PlantDetailPage: FC = () => {
  const { plantId = "" } = useParams();
  const navigate = useNavigate();
  const errorDispatch = useErrorDispatch();

  const { data: plant, isLoading, error } = useGetPlantById(plantId);

  useEffect(() => {
    if (error) {
      errorDispatch("Ha habido un problema al cargar la información de esta planta. Por favor, inténtalo más tarde");
    }
  }, [error, errorDispatch]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 3 },
          p: { xs: 0, sm: 2, md: 3 },
          minHeight: "100vh",
          background: "#f5f7fa",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Typography>Cargando...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !plant) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 3 },
          p: { xs: 0, sm: 2, md: 3 },
          minHeight: "100vh",
          background: "#f5f7fa",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 0 } }}>
          <Typography>Error al cargar la planta</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
        p: { xs: 0, sm: 2, md: 3 },
        minHeight: "100vh",
        background: "#f5f7fa",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Breadcrumb */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <BreadCrumb
          steps={[
            { label: "Inicio", href: "/" },
            { label: "Producción", href: "/production" },
            { label: plant.code || plantId, href: "#" },
          ]}
        />
      </Box>

      {/* Header Section */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: { xs: 2, sm: 3 },
            background: "#667eea",
            color: "white",
            boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  width: 64,
                  height: 64,
                }}
              >
                <SolarPowerIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {plant.name || "Sin nombre"}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {plant.code}
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              to={`/production/${plantId}/edit`}
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.2)",
                color: "white",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.3)",
                },
              }}
            >
              Editar
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 0 } }}>
        <Grid container spacing={3}>
          {/* Specifications Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "white",
                boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
                height: "100%",
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Especificaciones
              </Typography>
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Total Power */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(102, 126, 234, 0.08)",
                  }}
                >
                  <BoltIcon sx={{ color: "#667eea", fontSize: 28 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Potencia total
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="#667eea">
                      {plant.totalPower || 0} kW
                    </Typography>
                  </Box>
                </Box>

                {/* Connection Date */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(16, 185, 129, 0.08)",
                  }}
                >
                  <CalendarTodayIcon sx={{ color: "#10b981", fontSize: 28 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Fecha de conexión
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="#10b981">
                      {formatDate(plant.connectionDate)}
                    </Typography>
                  </Box>
                </Box>

                {/* Inverter Provider */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(236, 72, 153, 0.08)",
                  }}
                >
                  <BusinessIcon sx={{ color: "#ec4899", fontSize: 28 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Proveedor de inversor
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="#ec4899">
                      {plant.inverterProvider || "N/A"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Location Card */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "white",
                boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
                height: "100%",
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Ubicación y vinculación
              </Typography>
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Address */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(0, 0, 0, 0.02)",
                  }}
                >
                  <LocationOnIcon sx={{ color: "#64748b", fontSize: 28, mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                      Dirección
                    </Typography>
                    <Typography variant="body1" color="text.primary">
                      {plant.address || "Dirección no disponible"}
                    </Typography>
                  </Box>
                </Box>

                {/* Linked Supply Point */}
                {plant.supply && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(102, 126, 234, 0.08)",
                    }}
                  >
                    <ElectricMeterIcon sx={{ color: "#667eea", fontSize: 28, mt: 0.5 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Punto de suministro vinculado
                      </Typography>
                      <Typography variant="body1" fontWeight="600" color="#667eea">
                        {plant.supply.name || plant.supply.code}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {plant.supply.code}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Description Card */}
          {plant.description && (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "white",
                  boxShadow: "0 4px 20px 0 rgba(0,0,0,0.08)",
                }}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Descripción
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>
                  {plant.description}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};
