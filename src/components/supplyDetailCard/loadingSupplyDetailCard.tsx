import { type FC } from "react";
import { Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { CardTemplate } from "../cardTemplate/CardTemplate";
import { LoadingStat } from "../stat/LoadingStat";
import { LoadingDropdownCard } from "../dropdownCard/LoadingDropdownCard";


export const LoadingSupplyDetailCard: FC = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  return <>
    { isSmall ?
      <LoadingDropdownCard>
        <SupplyDetailContent />
      </LoadingDropdownCard>
      :
      <CardTemplate className="p-4 grid grid-flow-col auto-cols-fr gap-2 content-center items-center w-full">
        <Typography className="text-2xl font-extrabold"><Skeleton/></Typography>
        <SupplyDetailContent />
      </CardTemplate>
    }
  </>
}

const SupplyDetailContent: FC = () => {
  return <>
    <LoadingStat label="CUPS:" />
    <LoadingStat label="Dirección:" />
    <LoadingStat label="Coeficiente de reparto:" />
  </>
}
