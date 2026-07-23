import type { FC } from "react";
import { Box, Typography, Chip } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import type { SupplyResponse } from "../../api/models";
import { DetailHeader, DetailTile } from "../DetailHeader";
import { colors } from "../../theme/tokens";

export interface SupplyDetailHeaderProps {
  supplyPoint?: SupplyResponse;
  isLoading?: boolean;
  error?: unknown;
}

export const SupplyDetailHeader: FC<SupplyDetailHeaderProps> = ({
  supplyPoint,
  isLoading = false,
  error = null,
}) => (
  <DetailHeader
    icon={<ElectricMeterIcon sx={{ fontSize: 32 }} />}
    title={
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography variant="h4">
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
              backgroundColor: supplyPoint?.enabled ? colors.success : colors.error,
            }}
          />
        )}
      </Box>
    }
    subtitle={supplyPoint?.address || "Dirección no disponible"}
    isLoading={isLoading}
    error={error}
  >
    <DetailTile label="CUPS">
      <Typography variant="body1" fontWeight="bold">
        {supplyPoint?.code || "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Referencia catastral">
      <Typography variant="body1" fontWeight="bold">
        {supplyPoint?.addressRef || "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Propietario">
      <Typography variant="body1" fontWeight="bold">
        {supplyPoint?.user?.fullName || "-"}
      </Typography>
    </DetailTile>
  </DetailHeader>
);
