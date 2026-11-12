import { useState, type FC, type MouseEvent } from "react";
import { Box, IconButton, Link, MenuItem, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { PlantResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { formatCalendarDate, SHORT_CALENDAR_DATE } from "../../utils/formatCalendarDate";
import { colors, radii } from "../../theme/tokens";
import { formatKilowatts, formatKilowattsPeak } from "../../utils/formatKilowatts";
import { inverterProviderLabel } from "../../utils/inverterProviderLabel";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";

export interface PlantDetailHeaderProps {
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
  /**
   * Opens the plant's edit form, given the menu's button so focus can return
   * to it. Given only when the caller may edit the plant (UI-PLT-014).
   */
  onEditRequest?: (opener: HTMLElement | null) => void;
  /** Opens the deletion's confirmation. Given only when the caller may delete the plant. */
  onDeleteRequest?: (opener: HTMLElement | null) => void;
}

export const PlantDetailHeader: FC<PlantDetailHeaderProps> = ({
  plant,
  isLoading = false,
  error = null,
  onEditRequest,
  onDeleteRequest,
}) => {
  const supply = plant?.supply;
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const choose = (request: ((opener: HTMLElement | null) => void) | undefined) => () => {
    const opener = anchorElement;
    setAnchorElement(null);
    request?.(opener);
  };

  // Without an action there is no menu at all: the button is a promise of something to do.
  const menu = plant && (onEditRequest || onDeleteRequest) && (
    <>
      <IconButton
        onClick={(event: MouseEvent<HTMLElement>) => setAnchorElement(event.currentTarget)}
        aria-label="Más opciones de la planta"
        sx={{
          color: colors.text.secondary,
          border: "1px solid",
          borderColor: colors.divider,
          borderRadius: radii.default,
          bgcolor: colors.background.paper,
          "&:hover": { backgroundColor: colors.background.surface },
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <MenuTemplate anchorElement={anchorElement} onClose={() => setAnchorElement(null)}>
        <Box sx={{ py: 1 }}>
          {onEditRequest && (
            <MenuItem onClick={choose(onEditRequest)}>
              <EditOutlinedIcon sx={{ mr: 2, fontSize: 20, color: "primary.main", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "left" }}>
                Editar planta
              </Typography>
            </MenuItem>
          )}
          {onDeleteRequest && (
            <MenuItem
              onClick={choose(onDeleteRequest)}
              sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
            >
              <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.main", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500, textAlign: "left" }}>
                Eliminar planta
              </Typography>
            </MenuItem>
          )}
        </Box>
      </MenuTemplate>
    </>
  );

  // The CAU leads: a phone shows the first two facts and moves the rest into
  // the details, where a fact loses its copy button.
  const keyFacts: DetailKeyFacts = [
    {
      label: "CAU",
      value: plant?.regulatoryCode || "-",
      // No value, no control: a copy button over a dash would promise nothing.
      ...(plant?.regulatoryCode ? { copyable: plant.regulatoryCode } : {}),
    },
    { label: "Potencia pico", shortLabel: "Pico", value: plant ? formatKilowattsPeak(plant.peakPowerKWp) : "-" },
    { label: "Potencia nominal", shortLabel: "Nominal", value: plant ? formatKilowatts(plant.nominalPowerKW) : "-" },
  ];

  const details: DetailFact[] = [
    { label: "Código de proveedor", value: plant?.providerCode || "-" },
    { label: "Proveedor de inversor", value: plant?.inverterProvider ? inverterProviderLabel(plant.inverterProvider) : "-" },
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
              communities it still holds a UUID. Never label the link with it.
              A reference has no address, so without a name the label would be
              the CUPS already shown, and is left out. */}
          {supplyDisplayLabel(supply) !== supply.code && (
            <Typography variant="caption" sx={{ display: "block", color: colors.text.subtle, fontWeight: 400 }}>
              {supplyDisplayLabel(supply)}
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
      menu={menu || undefined}
      isLoading={isLoading}
      error={error}
    />
  );
};
