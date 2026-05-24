import { type FC } from "react";
import { Card, Typography, useMediaQuery, useTheme } from "@mui/material";
import { AppAccordion } from "../AppAccordion/AppAccordion";
import { Stat } from "../Stat/Stat";

interface SupplyDetailCardProps {
  name?: string;
  cups?: string;
  address?: string;
  partitionCoeficient?: number;
}

export const SupplyDetailCard: FC<SupplyDetailCardProps> = ({
  name = "",
  cups = "",
  address = "",
  partitionCoeficient = 0,
}) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <>
      {isSmall ? (
        <AppAccordion title={name}>
          <SupplyDetailContent cups={cups} address={address} partitionCoeficient={partitionCoeficient} />
        </AppAccordion>
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
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{name}</Typography>
          <SupplyDetailContent cups={cups} address={address} partitionCoeficient={partitionCoeficient} />
        </Card>
      )}
    </>
  );
};

interface SupplyDetailContentProps {
  cups: string;
  address: string;
  partitionCoeficient: number;
}

const SupplyDetailContent: FC<SupplyDetailContentProps> = ({ cups, address, partitionCoeficient }) => {
  return (
    <>
      <Stat label="CUPS:" value={cups} />
      <Stat label="Dirección:" value={address} />
      <Stat label="Coeficiente de reparto:" value={`${partitionCoeficient.toFixed(4)}%`} />
    </>
  );
};
