import { SupplyStatsCard, Mui } from "conluz-web";

export const Default = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupplyStatsCard consumption={312.5} selfconsumption={184.2} surplus={42.8} selfconstumptionRate={58.9} utilizationRate={81.1} />
  </Mui.Box>
);

export const NoSurplus = () => (
  <Mui.Box sx={{ width: "100%" }}>
    <SupplyStatsCard consumption={100} selfconsumption={40} surplus={0} selfconstumptionRate={40} utilizationRate={100} />
  </Mui.Box>
);
