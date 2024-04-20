"use client";

// ** React Imports
import { JSXElementConstructor, ReactElement, ReactNode } from "react";

// ** MUI Imports
import { GridColDef, GridActionsCellItemProps } from "@mui/x-data-grid";

export type ToolbarItem = {
  content: ReactNode;
};

export type ToolbarItemGroup = {
  itemGroup: ToolbarItem[];
};

export type ToolbarContainerProps = {
  itemGroups: ToolbarItemGroup[];
};

export interface Data {
  id: number;
  cups: string;
  address: string;
  distributionCoefficient: number;
  owner: string;
  status: string;
  actions: string;
}

export type DataGridContainerProps = {
  columnDefinitions: GridColDef[];
  initialRows: Data[];
  actions?: ReactElement<
    GridActionsCellItemProps,
    string | JSXElementConstructor<any>
  >[];
};
