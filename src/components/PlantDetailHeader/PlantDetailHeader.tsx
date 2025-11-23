import type { FC } from "react";
import { Box, Paper, Typography, Avatar } from "@mui/material";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import type { PlantResponse } from "../../api/models";

export interface PlantDetailHeaderProps {
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
}

export const PlantDetailHeader: FC<PlantDetailHeaderProps> = ({
  plant,
  isLoading = false,
  error = null,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return "-";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 0, sm: 3 },
        background: "#667eea",
        color: "white",
        mx: { xs: 0, sm: 0 },
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3 }}>
        <Avatar
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.2)",
            width: 56,
            height: 56,
          }}
        >
          <SolarPowerIcon sx={{ fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {plant?.name || "Planta de Producción"}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {plant?.address || "Dirección no disponible"}
          </Typography>
        </Box>
      </Box>

      {/* Plant Details Grid */}
      {!isLoading && !error && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
              Código
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {plant?.code || "-"}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
              Potencia total
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {plant?.totalPower ? `${plant.totalPower} kW` : "-"}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
              Fecha de conexión
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {formatDate(plant?.connectionDate)}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: 2,
              p: 2,
            }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
              Proveedor de inversor
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {plant?.inverterProvider || "-"}
            </Typography>
          </Box>

          {plant?.supply && (
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
                gridColumn: { xs: "1", sm: "span 2" },
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                Punto de suministro vinculado
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {plant.supply.name || plant.supply.code}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {plant.supply.code}
              </Typography>
            </Box>
          )}

          {plant?.description && (
            <Box
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 2,
                p: 2,
                gridColumn: { xs: "1", sm: "span 2", md: plant?.supply ? "span 2" : "span 4" },
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.8, display: "block", mb: 0.5 }}>
                Descripción
              </Typography>
              <Typography variant="body2" fontWeight="500" sx={{ opacity: 0.95 }}>
                {plant.description}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
