import type { FC } from "react"
import { Divider, useMediaQuery, useTheme } from "@mui/material"
import { CardTemplate } from "../cardTemplate/CardTemplate"
import { Stat } from "../stat/Stat"

interface SupplyStatsCardProps {
  consumption: number,
  selfconsumption: number,
  surplus: number
  selfconstumptionRate: number,
  utilizationRate: number
}

export const SupplyStatsCard: FC<SupplyStatsCardProps> = ({ consumption, selfconsumption, surplus, selfconstumptionRate, utilizationRate }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'))
  
  return (
    <CardTemplate className="grid md:grid-flow-col md:auto-cols-max justify-center md:justify-between gap-2 p-4">
      <Stat className="text-center md:text-left" label="Consumo" value={`${consumption}kWh`} variant="big"/>
      <Stat className="text-center md:text-left" label="Autoconsumo" value={`${selfconsumption}kWh`} variant="big"/>
      <Stat className="text-center md:text-left" label="Excedente" value={`${surplus}kWh`} variant="big"/>
      { isSmall ? <Divider orientation="horizontal"/> : <Divider orientation="vertical"/>}
      <Stat className="text-center md:text-left" label="Porcentaje de autoconsumo" value={`${selfconstumptionRate}%`} variant="big"/>
      <Stat className="text-center md:text-left" label="Porcentaje de aprovechamiento" value={`${utilizationRate}%`} variant="big"/>
    </CardTemplate>
  )
}
