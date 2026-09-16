import type { FC } from "react";
import { Chip } from "@mui/material";
import ElectricMeterIcon from "@mui/icons-material/ElectricMeter";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import type { SupplyResponse } from "../../api/models";
import { DetailHeader, type DetailFact, type DetailKeyFacts } from "../DetailHeader";
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
}) => {
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
      isLoading={isLoading}
      error={error}
    />
  );
};
