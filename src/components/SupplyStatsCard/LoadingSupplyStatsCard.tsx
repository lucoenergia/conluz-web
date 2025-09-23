import type { FC } from "react";
import { Divider, useMediaQuery, useTheme } from "@mui/material";
import { CardTemplate } from "../CardTemplate/CardTemplate";
import { LoadingStat } from "../Stat/LoadingStat";

export const LoadingSupplyStatsCard: FC = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <CardTemplate className="grid md:grid-flow-col md:auto-cols-max justify-center md:justify-between gap-2 p-4">
      <LoadingStat className="text-center md:text-left" label="Consumo" variant="big" />
      <LoadingStat className="text-center md:text-left" label="Autoconsumo" variant="big" />
      <LoadingStat className="text-center md:text-left" label="Excedente" variant="big" />
      {isSmall ? <Divider orientation="horizontal" /> : <Divider orientation="vertical" />}
      <LoadingStat className="text-center md:text-left" label="Porcentaje de autoconsumo" variant="big" />
      <LoadingStat className="text-center md:text-left" label="Porcentaje de aprovechamiento" variant="big" />
    </CardTemplate>
  );
};
