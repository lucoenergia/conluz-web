import type { FC } from "react";
import { SupplyCard } from "../supplyCard/SupplyCard";
import { Box } from "@mui/material";
import type { SupplyResponse } from "../../api/models";

interface ItemListProps {
  itemList: SupplyResponse[];
}

export const CardList: FC<ItemListProps> = ({ itemList }) => {
  return (
    <Box className="mt-5">
      <ul>
        {itemList.map((item: SupplyResponse, index:number) => (
          <li key={index}>
            <SupplyCard
              id={item.id}
              partitionCoefficient={item.partitionCoefficient}
              datadisValidDateFrom={item.datadisValidDateFrom}
              name={item.name}
              address={item.address}
              datadisPointType={item.datadisPointType}
              enabled={item.enabled}
            />
          </li>
        ))}
      </ul>
    </Box>
  );
};