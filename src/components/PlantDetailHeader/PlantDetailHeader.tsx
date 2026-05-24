import type { FC } from "react";
import { Typography } from "@mui/material";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import type { PlantResponse } from "../../api/models";
import { DetailHeader, DetailTile } from "../DetailHeader";

export interface PlantDetailHeaderProps {
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

export const PlantDetailHeader: FC<PlantDetailHeaderProps> = ({
  plant,
  isLoading = false,
  error = null,
}) => (
  <DetailHeader
    icon={<SolarPowerIcon sx={{ fontSize: 32 }} />}
    title={
      <Typography variant="h4" gutterBottom>
        {plant?.name || "Planta de Producción"}
      </Typography>
    }
    subtitle={plant?.address || "Dirección no disponible"}
    isLoading={isLoading}
    error={error}
  >
    <DetailTile label="Código">
      <Typography variant="body1" fontWeight="bold">
        {plant?.code || "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Potencia total">
      <Typography variant="body1" fontWeight="bold">
        {plant?.totalPower ? `${plant.totalPower} kW` : "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Fecha de conexión">
      <Typography variant="body1" fontWeight="bold">
        {formatDate(plant?.connectionDate)}
      </Typography>
    </DetailTile>

    <DetailTile label="Proveedor de inversor">
      <Typography variant="body1" fontWeight="bold">
        {plant?.inverterProvider || "-"}
      </Typography>
    </DetailTile>

    {plant?.supply && (
      <DetailTile
        label="Punto de suministro vinculado"
        sx={{ gridColumn: { xs: "1", sm: "span 2" } }}
      >
        <Typography variant="body1" fontWeight="bold">
          {plant.supply.name || plant.supply.code}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {plant.supply.code}
        </Typography>
      </DetailTile>
    )}

    {plant?.description && (
      <DetailTile
        label="Descripción"
        sx={{
          gridColumn: {
            xs: "1",
            sm: "span 2",
            md: plant?.supply ? "span 2" : "span 4",
          },
        }}
      >
        <Typography variant="body2" fontWeight="500" sx={{ opacity: 0.95 }}>
          {plant.description}
        </Typography>
      </DetailTile>
    )}
  </DetailHeader>
);
