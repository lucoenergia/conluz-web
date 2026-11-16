import { useState, type FC, type MouseEvent } from "react";
import { Box, Chip, Divider, IconButton, MenuItem, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import type { SupplyResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { colors, radii } from "../../theme/tokens";
import { supplyDisplayLabel } from "../../utils/supplyDisplayLabel";

export interface SupplyDetailHeaderProps {
  supplyPoint?: SupplyResponse;
  isLoading?: boolean;
  error?: unknown;
  /**
   * Opens the deletion's confirmation. Given only when the supply reports
   * canDelete (#290).
   */
  onDeleteRequest?: () => void;
  /**
   * Opens the ownership transfer, with the menu's button as the control focus
   * returns to. Given only when the supply reports canTransferOwnership
   * (#423). Without it and without onDeleteRequest the header has no menu.
   */
  onTransferRequest?: (opener: HTMLElement | null) => void;
  /**
   * Where the plant this supply belongs to opens, when the caller may open it.
   * Without it a plant's own supply is still tagged, as plain text.
   */
  plantHref?: string;
}

const PLANT_TAG_SX = { fontWeight: 600, bgcolor: colors.brand.surface, color: "primary.main" } as const;

export const SupplyDetailHeader: FC<SupplyDetailHeaderProps> = ({
  supplyPoint,
  isLoading = false,
  error = null,
  onDeleteRequest,
  onTransferRequest,
  plantHref,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleDeleteClick = () => {
    setAnchorElement(null);
    onDeleteRequest?.();
  };

  // The menu item is gone once the menu closes, so focus returns to the
  // button that opened the menu.
  const handleTransferClick = () => {
    const opener = anchorElement;
    setAnchorElement(null);
    onTransferRequest?.(opener);
  };

  const menu = (onDeleteRequest || onTransferRequest) && supplyPoint && (
    <>
      <IconButton
        onClick={(event: MouseEvent<HTMLElement>) => setAnchorElement(event.currentTarget)}
        aria-label="Más opciones del punto de suministro"
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
          {onTransferRequest && (
            <MenuItem onClick={handleTransferClick}>
              <SwapHorizOutlinedIcon sx={{ mr: 2, fontSize: 20, color: "primary.main", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "left" }}>
                Cambiar titular
              </Typography>
            </MenuItem>
          )}
          {/* Deleting is destructive, so it goes last, below a divider. */}
          {onTransferRequest && onDeleteRequest && <Divider />}
          {onDeleteRequest && (
            <MenuItem
              onClick={handleDeleteClick}
              sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
            >
              <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.main", flexShrink: 0 }} />
              <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500, textAlign: "left" }}>
                Eliminar punto de suministro
              </Typography>
            </MenuItem>
          )}
        </Box>
      </MenuTemplate>
    </>
  );

  const keyFacts: DetailKeyFacts = [
    {
      label: "CUPS",
      value: supplyPoint?.code || "-",
      ...(supplyPoint?.code ? { copyable: supplyPoint.code } : {}),
    },
  ];

  const details: DetailFact[] = [
    { label: "Referencia catastral", value: supplyPoint?.addressRef || "-" },
    { label: "Propietario", value: supplyPoint?.ownerRecord?.fullName || "-" },
  ];

  return (
    <DetailHeader
      icon={<ElectricMeterIcon />}
      // The CUPS identifies the supply when nobody has named it; a blank title
      // would leave the page with no subject at all.
      title={supplyPoint ? supplyDisplayLabel(supplyPoint) : "Punto de Suministro"}
      subtitle={supplyPoint?.address || "Dirección no disponible"}
      subtitleIcon={<LocationOnIcon />}
      status={
        <>
          <Chip
            label={supplyPoint?.enabled ? "Activo" : "Inactivo"}
            color={supplyPoint?.enabled ? "success" : "error"}
            size="small"
            sx={{
              fontWeight: 600,
              color: "white",
              backgroundColor: supplyPoint?.enabled ? colors.success.main : colors.error.main,
            }}
          />
          {/* Read from the supply's own plant reference, never from its name (#252). */}
          {supplyPoint?.plant &&
            (plantHref ? (
              <Chip
                component={RouterLink}
                to={plantHref}
                clickable
                label="Punto de planta"
                aria-label={`Punto de planta: ver la planta ${supplyPoint.plant.name}`}
                size="small"
                sx={PLANT_TAG_SX}
              />
            ) : (
              <Chip label="Punto de planta" size="small" sx={PLANT_TAG_SX} />
            ))}
        </>
      }
      keyFacts={keyFacts}
      details={details}
      menu={menu || undefined}
      isLoading={isLoading}
      error={error}
    />
  );
};
