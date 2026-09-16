import type { FC } from "react";
import { Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { PlantResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { formatCalendarDate } from "../../utils/formatCalendarDate";
import { colors } from "../../theme/tokens";

export interface PlantDetailHeaderProps {
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
}

/** Short form: these dates sit in a strip cell and in a four-column grid. */
const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export const PlantDetailHeader: FC<PlantDetailHeaderProps> = ({ plant, isLoading = false, error = null }) => {
  const supply = plant?.supply;

  const keyFacts: DetailKeyFacts = [
    { label: "Potencia", value: plant?.totalPower ? `${plant.totalPower} kW` : "-" },
    {
      label: "CAU",
      value: plant?.regulatoryCode || "-",
      // No value, no control: a copy button over a dash would promise nothing.
      ...(plant?.regulatoryCode ? { copyable: plant.regulatoryCode } : {}),
    },
  ];

  const details: DetailFact[] = [
    { label: "Código de proveedor", value: plant?.providerCode || "-" },
    { label: "Proveedor de inversor", value: plant?.inverterProvider || "-" },
    { label: "Fecha de conexión", value: formatCalendarDate(plant?.connectionDate ?? undefined, SHORT_DATE) },
  ];

  if (supply) {
    details.push({
      label: "Punto de suministro vinculado",
      value: (
        <>
          <Link
            component={RouterLink}
            to={`/supply-points/${supply.id}`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              color: "primary.main",
              fontWeight: 600,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {supply.code}
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
          {/* The CUPS identifies the supply; the name is a nicety, and on some
              communities it still holds a UUID. Never label the link with it. */}
          {supply.name && (
            <Typography variant="caption" sx={{ display: "block", color: colors.text.subtle, fontWeight: 400 }}>
              {supply.name}
            </Typography>
          )}
        </>
      ),
    });
  }

  if (plant?.description) {
    details.push({ label: "Descripción", value: plant.description, wide: true });
  }

  return (
    <DetailHeader
      icon={<SolarPowerIcon />}
      title={plant?.name || "Planta de Producción"}
      subtitle={plant?.address || "Dirección no disponible"}
      subtitleIcon={<LocationOnIcon />}
      keyFacts={keyFacts}
      details={details}
      isLoading={isLoading}
      error={error}
    />
  );
};
