import type { FC } from "react";
import { Card, Divider, useMediaQuery, useTheme } from "@mui/material";
import { Stat } from "../Stat/Stat";
import { formatKilowattHours } from "../../utils/formatEnergyFigures";
import { formatPercentage } from "../../utils/formatPercentage";

const SHARE = { maximumFractionDigits: 2, minimumFractionDigits: 0 };

interface SupplyStatsCardProps {
  consumption: number;
  selfconsumption: number;
  surplus: number;
  selfconstumptionRate: number;
  utilizationRate: number;
}

export const SupplyStatsCard: FC<SupplyStatsCardProps> = ({
  consumption,
  selfconsumption,
  surplus,
  selfconstumptionRate,
  utilizationRate,
}) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card
      sx={{
        display: "grid",
        gridAutoFlow: { md: "column" },
        gridAutoColumns: { md: "max-content" },
        justifyContent: { md: "space-between" },
        textAlign: { xs: "center", md: "left" },
        gap: 1,
        p: 2,
      }}
    >
      <Stat label="Consumo" value={formatKilowattHours(consumption)} variant="big" />
      <Stat label="Autoconsumo" value={formatKilowattHours(selfconsumption)} variant="big" />
      <Stat label="Excedente" value={formatKilowattHours(surplus)} variant="big" />
      {isSmall ? <Divider orientation="horizontal" /> : <Divider orientation="vertical" />}
      <Stat label="Porcentaje de autoconsumo" value={formatPercentage(selfconstumptionRate / 100, SHARE)} variant="big" />
      <Stat label="Porcentaje de aprovechamiento" value={formatPercentage(utilizationRate / 100, SHARE)} variant="big" />
    </Card>
  );
};
