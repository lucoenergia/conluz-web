import type { FC } from "react";
import { Card, Divider, useMediaQuery, useTheme } from "@mui/material";
import { LoadingStat } from "../Stat/LoadingStat";

export const LoadingSupplyStatsCard: FC = () => {
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
      <LoadingStat label="Consumo" variant="big" />
      <LoadingStat label="Autoconsumo" variant="big" />
      <LoadingStat label="Excedente" variant="big" />
      {isSmall ? <Divider orientation="horizontal" /> : <Divider orientation="vertical" />}
      <LoadingStat label="Porcentaje de autoconsumo" variant="big" />
      <LoadingStat label="Porcentaje de aprovechamiento" variant="big" />
    </Card>
  );
};
