import * as React from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import DotsVertical from "mdi-material-ui/DotsVertical";
import { Box, Button, Chip, Typography } from "@mui/material";
import DataGridToolbarContent from "./DataGridToolbarContent";

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <Button variant="contained">
        <Typography
          variant="button"
          sx={{
            fontSize: { xs: 10, sm: 10 },
          }}
        >
          Nuevo punto de suministro
        </Typography>
      </Button>
      <GridToolbarExport />
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

const columns: GridColDef[] = [
  {
    field: "cups",
    headerName: "CUPS",
    flex: 1,
    editable: false,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
  },
  {
    field: "address",
    headerName: "Dirección",
    type: "string",
    flex: 1,
    editable: false,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
  },
  {
    field: "distributionCoefficient",
    headerName: "Coeficiente de reparto (%)",
    type: "numeric",
    flex: 1,
    editable: false,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
  },
  {
    field: "owner",
    headerName: "Titular",
    type: "string",
    flex: 1,
    editable: false,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
  },
  {
    field: "status",
    type: "actions",
    headerName: "Estado",
    flex: 1,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
    cellClassName: "actions",
    getActions: ({ id, row }) => {
      return [<Chip label={row.status} color="success" />];
    },
  },
  {
    field: "actions",
    type: "actions",
    headerName: "Acciones",
    flex: 1,
    headerClassName: "super-app-theme--header",
    align: "left",
    headerAlign: "left",
    cellClassName: "actions",
    getActions: ({ id }) => {
      return [
        <GridActionsCellItem
          key="4"
          icon={<DotsVertical />}
          label="More"
          color="inherit"
        />,
      ];
    },
  },
];

export interface Data {
  id: number;
  cups: string;
  address: string;
  distributionCoefficient: number;
  owner: string;
  status: string;
  actions: string;
}

export function createData(
  id: number,
  cups: string,
  address: string,
  distributionCoefficient: number,
  owner: string,
  status: string,
  actions: string
): Data {
  return {
    id,
    cups,
    address,
    distributionCoefficient,
    owner,
    status,
    actions,
  };
}

export default function SimpleDataGrid({ rows }: { rows: Data[] }) {
  function CustomToolbar() {
    return <DataGridToolbarContent />;
  }

  return (
    <Box style={{ width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        slots={{
          toolbar: CustomToolbar,
        }}
      />
    </Box>
  );
}
