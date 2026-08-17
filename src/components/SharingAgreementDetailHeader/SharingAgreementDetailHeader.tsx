import type { FC } from "react";
import { Box, Typography } from "@mui/material";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import type { PlantResponse, SharingAgreementResponse } from "../../api/models";
import { DetailHeader, DetailTile } from "../DetailHeader";
import { SharingAgreementStatusChip } from "../SharingAgreementStatusChip";
import { formatCalendarDate } from "../../utils/formatCalendarDate";

export interface SharingAgreementDetailHeaderProps {
  agreement?: SharingAgreementResponse;
  plant?: PlantResponse;
  isLoading?: boolean;
  error?: unknown;
}

export const SharingAgreementDetailHeader: FC<SharingAgreementDetailHeaderProps> = ({
  agreement,
  plant,
  isLoading = false,
  error = null,
}) => (
  <DetailHeader
    icon={<HandshakeOutlinedIcon sx={{ fontSize: 32 }} />}
    title={
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography variant="h4">{agreement?.name || "Acuerdo de reparto"}</Typography>
        {!isLoading && !error && <SharingAgreementStatusChip status={agreement?.status} tone="onDark" />}
      </Box>
    }
    subtitle={plant?.regulatoryCode ? `CAU: ${plant.regulatoryCode}` : "CAU no disponible"}
    isLoading={isLoading}
    error={error}
  >
    <DetailTile label="Fecha de creación">
      <Typography variant="body1" fontWeight="bold">
        {formatCalendarDate(agreement?.createdAt)}
      </Typography>
    </DetailTile>

    <DetailTile label="Potencia instalada">
      <Typography variant="body1" fontWeight="bold">
        {agreement?.installedPowerKw !== undefined ? `${agreement.installedPowerKw} kW` : "-"}
      </Typography>
    </DetailTile>

    <DetailTile label="Notas" sx={{ gridColumn: { xs: "1", sm: "span 2", md: "span 2" } }}>
      <Typography variant="body2" fontWeight="500" sx={{ opacity: 0.95 }}>
        {agreement?.notes || "-"}
      </Typography>
    </DetailTile>
  </DetailHeader>
);
