import { type FC } from "react";
import { Typography, useMediaQuery, useTheme } from "@mui/material";
import { CardTemplate } from "../CardTemplate/CardTemplate";
import { DropdownCard } from "../DropdownCard/DropdownCard";
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
        <DropdownCard title={name}>
          <SupplyDetailContent cups={cups} address={address} partitionCoeficient={partitionCoeficient} />
        </DropdownCard>
      ) : (
        <CardTemplate className="p-4 grid grid-flow-col auto-cols-fr gap-2 content-center items-center w-full">
          <Typography className="text-2xl font-extrabold">{name}</Typography>
          <SupplyDetailContent cups={cups} address={address} partitionCoeficient={partitionCoeficient} />
        </CardTemplate>
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
