import type { FC } from "react";
import { SupplyCard } from "../supplyCard/SupplyCard";
import { Box } from "@mui/material";
import type { SupplyPointData } from "../../utils/types";

interface ItemListProps {
  itemList: SupplyPointData[];
}

export const CardList: FC<ItemListProps> = ({ itemList }) => {
  return (
    <Box>
      <ul>
        {itemList.map((item: SupplyPointData, index:number) => (
          <li key={index}>
            <SupplyCard
              supplyPointId={item.supplyPointId}
              kWh={item.kWh}
              lastCheckTime={item.lastCheckTime}
              supplyPointName={item.supplyPointName}
              address={item.address}
              average={item.average}
              status={item.status}
            />
          </li>
        ))}
      </ul>
    </Box>
  );
};