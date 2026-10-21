import { useState, type FC, type MouseEvent } from "react";
import { Box, Chip, IconButton, MenuItem, Typography } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import type { SupplyResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
import { MenuTemplate } from "../Menu/MenuTemplate";
import { colors, radii } from "../../theme/tokens";

export interface SupplyDetailHeaderProps {
  supplyPoint?: SupplyResponse;
  isLoading?: boolean;
  error?: unknown;
  /**
   * Opens the deletion's confirmation. Given only when the supply reports
   * canDelete (#290); without it the header has no menu at all.
   */
  onDeleteRequest?: () => void;
}

export const SupplyDetailHeader: FC<SupplyDetailHeaderProps> = ({
  supplyPoint,
  isLoading = false,
  error = null,
  onDeleteRequest,
}) => {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleDeleteClick = () => {
    setAnchorElement(null);
    onDeleteRequest?.();
  };

  const menu = onDeleteRequest && supplyPoint && (
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
          <MenuItem
            onClick={handleDeleteClick}
            sx={{ "&:hover": { backgroundColor: colors.background.errorFaint } }}
          >
            <DeleteOutlineIcon sx={{ mr: 2, fontSize: 20, color: "error.main", flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: "error.main", fontWeight: 500, textAlign: "left" }}>
              Eliminar punto de suministro
            </Typography>
          </MenuItem>
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
    { label: "Propietario", value: supplyPoint?.user?.fullName || "-" },
  ];

  return (
    <DetailHeader
      icon={<ElectricMeterIcon />}
      // The CUPS identifies the supply when nobody has named it; a blank title
      // would leave the page with no subject at all.
      title={supplyPoint?.name || supplyPoint?.code || "Punto de Suministro"}
      subtitle={supplyPoint?.address || "Dirección no disponible"}
      subtitleIcon={<LocationOnIcon />}
      status={
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
      }
      keyFacts={keyFacts}
      details={details}
      menu={menu || undefined}
      isLoading={isLoading}
      error={error}
    />
  );
};
