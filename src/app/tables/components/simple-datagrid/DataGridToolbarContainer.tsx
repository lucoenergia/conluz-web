"use client";

// ** React Imports
import { Fragment } from "react";

// ** MUI Imports
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import { GridToolbarContainer } from "@mui/x-data-grid";

// ** Types Imports
import { ToolbarContainerProps, ToolbarItemGroup, ToolbarItem } from "./types";

const DataGridToolbarContainer = (props: ToolbarContainerProps) => {
  // ** Props
  const { itemGroups } = props;

  return (
    <GridToolbarContainer className="flex justify-end text-white rounded-t">
      <Box className="flex gap-5 h-8">
        {itemGroups.map((itemGroup: ToolbarItemGroup, groupIndex: number) => (
          <Fragment key={groupIndex}>
            {itemGroup.itemGroup.map((item: ToolbarItem, itemIndex: number) => (
              <Fragment key={itemIndex}>
                <Box className="flex-initial">{item.content}</Box>
                {itemIndex !== itemGroup.itemGroup.length - 1 && (
                  <Divider
                    orientation="vertical"
                    variant="middle"
                    flexItem
                    sx={{ margin: 0 }}
                  />
                )}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </Box>
    </GridToolbarContainer>
  );
};

export default DataGridToolbarContainer;
