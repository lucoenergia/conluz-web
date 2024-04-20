"use client";

import AddIcon from "@mui/icons-material/Add";

// ** MUI Imports
import Button from "@mui/material/Button";
import { GridToolbarExport, GridToolbarQuickFilter } from "@mui/x-data-grid";

// ** Types Imports
import DataGridToolbarContainer from "./DataGridToolbarContainer";
import { ToolbarContainerProps, ToolbarItemGroup, ToolbarItem } from "./types";

export default function DataGridToolbarContent() {
  const toolbarItemGroups: ToolbarContainerProps = {
    itemGroups: [getToolbarEditItemGroup(), getToolbarGeneralItemGroup()],
  };

  return <DataGridToolbarContainer itemGroups={toolbarItemGroups.itemGroups} />;
}

function getToolbarEditItemGroup(): ToolbarItemGroup {
  const toolbarAddItemContent: ToolbarItem = {
    content: (
      <Button
        id="toolbar-custom-buttons"
        startIcon={<AddIcon />}
        variant="contained"
        className="h-full"
      >
        NUEVO
      </Button>
    ),
  };

  const toolbarEditItemGroup: ToolbarItemGroup = {
    itemGroup: [toolbarAddItemContent],
  };

  return toolbarEditItemGroup;
}

function getToolbarGeneralItemGroup(): ToolbarItemGroup {
  const toolbarExportItemContent: ToolbarItem = {
    content: <GridToolbarExport className="h-full" />,
  };

  const toolbarSearchItemContent: ToolbarItem = {
    content: <GridToolbarQuickFilter className="h-full" />,
  };

  const toolbarGeneralItemGroup: ToolbarItemGroup = {
    itemGroup: [toolbarExportItemContent, toolbarSearchItemContent],
  };

  return toolbarGeneralItemGroup;
}
