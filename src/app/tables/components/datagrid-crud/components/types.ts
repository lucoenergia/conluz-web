"use client";

// ** React Imports
import {
  JSXElementConstructor,
  MutableRefObject,
  ReactElement,
  ReactNode,
} from "react";

// ** MUI Imports
import {
  GridRowsProp,
  GridRowModesModel,
  GridColDef,
  GridActionsCellItemProps,
} from "@mui/x-data-grid";
import { GridApiCommunity } from "@mui/x-data-grid/internals";

export type ToolbarItem = {
  content: ReactNode;
};

export type ToolbarItemGroup = {
  itemGroup: ToolbarItem[];
};

export type ToolbarContainerProps = {
  itemGroups: ToolbarItemGroup[];
};

export interface ToolbarContentProps {
  setRows: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
  setRowModesModel: (
    newModel: (oldModel: GridRowModesModel) => GridRowModesModel
  ) => void;
}

export type PaginationProps = {
  apiRef: MutableRefObject<GridApiCommunity>;
  page: number;
  pageCount: number;
};

export type DataGridContainerProps = {
  columnDefinitions: GridColDef[];
  initialRows: GridRowsProp;
  actions?: ReactElement<
    GridActionsCellItemProps,
    string | JSXElementConstructor<any>
  >[];
};
