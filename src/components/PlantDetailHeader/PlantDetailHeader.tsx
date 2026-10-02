import type { FC } from "react";
import { Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { PlantResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";
import { colors } from "../../theme/tokens";

export interface PlantDetailHeaderProps {
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
}

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
    { label: "Fecha de conexión", value: formatCalendarDate(plant?.connectionDate ?? undefined, SHORT_CALENDAR_DATE) },
  ];

  if (supply) {
    details.push({
      label: "Punto de suministro vinculado",
      value: (
        <>
          {/* A link only when following it would succeed. Listing plants is open
              to any member, but GET /supplies/{id} is not, so the reference
              carries no owner and `canReadSupply` is what answers. Denied, the
              CUPS is still shown -- it identifies the supply, and withholding
              it would hide the plant's own data, not someone else's. */}
          {plant?.capabilities.canReadSupply ? (
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
          ) : (
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {supply.code}
            </Typography>
          )}
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
