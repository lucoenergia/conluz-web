import type { FC } from "react";
import { Box, Paper, Typography, Avatar, Chip } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import type { SupplyResponse } from "../../api/models";

export interface SupplyDetailHeaderProps {
  supplyPoint?: SupplyResponse;
  isLoading?: boolean;
  error?: unknown;
}

export const SupplyDetailHeader: FC<SupplyDetailHeaderProps> = ({
  supplyPoint,
  isLoading = false,
  error = null,
}) => {
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
          <ElectricMeterIcon sx={{ fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" fontWeight="bold">
              {supplyPoint?.name || "Punto de Suministro"}
            </Typography>
            {!isLoading && !error && (
              <Chip
                label={supplyPoint?.enabled ? "Activo" : "Inactivo"}
                color={supplyPoint?.enabled ? "success" : "error"}
                size="small"
                sx={{
                  fontWeight: 600,
                  color: "white",
                  backgroundColor: supplyPoint?.enabled ? "#10b981" : "#ef4444",
                }}
              />
            )}
          </Box>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            {supplyPoint?.address || "Dirección no disponible"}
          </Typography>
        </Box>
      </Box>

      {/* Supply Details Grid */}
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
              CUPS
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {supplyPoint?.code || "-"}
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
              Referencia catastral
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {supplyPoint?.addressRef || "-"}
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
              Coeficiente de reparto
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {supplyPoint?.partitionCoefficient ? `${(supplyPoint.partitionCoefficient * 100).toFixed(2)}%` : "-"}
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
              Propietario
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {supplyPoint?.user?.fullName || "-"}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
