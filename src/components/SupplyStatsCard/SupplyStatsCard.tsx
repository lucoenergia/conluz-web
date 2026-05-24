import type { FC } from "react";
import { Card, Divider, useMediaQuery, useTheme } from "@mui/material";
import { Stat } from "../Stat/Stat";

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
      <Stat label="Consumo" value={`${consumption}kWh`} variant="big" />
      <Stat label="Autoconsumo" value={`${selfconsumption}kWh`} variant="big" />
      <Stat label="Excedente" value={`${surplus}kWh`} variant="big" />
      {isSmall ? <Divider orientation="horizontal" /> : <Divider orientation="vertical" />}
      <Stat label="Porcentaje de autoconsumo" value={`${selfconstumptionRate}%`} variant="big" />
      <Stat label="Porcentaje de aprovechamiento" value={`${utilizationRate}%`} variant="big" />
    </Card>
  );
};
