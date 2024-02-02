"use client";

import { faker } from "@faker-js/faker";
import AddIcon from "@mui/icons-material/Add";

// ** MUI Imports
import Button from "@mui/material/Button";
import {
  GridRowModes,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";

// ** Types Imports
import {
  ToolbarContainerProps,
  ToolbarItemGroup,
  ToolbarItem,
  ToolbarContentProps,
} from "./types";
import DataGridToolbarContainer from "./DataGridToolbarContainer";

export default function DataGridToolbarContent(props: ToolbarContentProps) {
  const toolbarItemGroups: ToolbarContainerProps = {
    itemGroups: [getToolbarEditItemGroup(props), getToolbarGeneralItemGroup()],
  };

  return <DataGridToolbarContainer itemGroups={toolbarItemGroups.itemGroups} />;
}

function getToolbarEditItemGroup(props: ToolbarContentProps): ToolbarItemGroup {
  const { setRows, setRowModesModel } = props;

  const handleClick = () => {
    const id = faker.string.numeric(1);
    setRows((oldRows) => [
      ...oldRows,
      { id, name: "", firstName: "", secondName: "", isNew: true },
    ]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: "name" },
    }));
  };

  const toolbarAddItemContent: ToolbarItem = {
    content: (
      <Button
        id="toolbar-custom-buttons"
        startIcon={<AddIcon />}
        onClick={handleClick}
        variant="contained"
        className="h-full"
      >
        AÑADIR
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
