import { type FC } from "react";
import { Card, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { LoadingAppAccordion } from "../AppAccordion/LoadingAppAccordion";
import { LoadingStat } from "../Stat/LoadingStat";

export const LoadingSupplyDetailCard: FC = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <>
      {isSmall ? (
        <LoadingAppAccordion>
          <SupplyDetailContent />
        </LoadingAppAccordion>
      ) : (
        <Card
          sx={{
            p: 2,
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "1fr",
            gap: 1,
            alignContent: "center",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            <Skeleton />
          </Typography>
          <SupplyDetailContent />
        </Card>
      )}
    </>
  );
};

const SupplyDetailContent: FC = () => {
  return (
    <>
      <LoadingStat label="CUPS:" />
      <LoadingStat label="Dirección:" />
      <LoadingStat label="Coeficiente de reparto:" />
    </>
  );
};
