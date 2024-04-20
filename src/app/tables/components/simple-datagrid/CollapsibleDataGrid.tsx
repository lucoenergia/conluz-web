import React from "react";
import { MUIDataTableColumn, MUIDataTableOptions } from "mui-datatables";
import {
  Table,
  TableCell,
  TableRow,
  TableBody,
  Typography,
  Box,
  Tooltip,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import * as S from "./Collapsible.styles";

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

const ExpandableRowTable = ({ rows }: { rows: Data[] }) => {
  const columns: MUIDataTableColumn[] = [
    {
      name: "cups",
      label: "CUPS",
      options: {
        display: "excluded",
      },
    },
    {
      name: "address",
      label: "Dirección",
      options: {
        display: "excluded",
      },
    },
    {
      name: "distributionCoefficient",
      label: "Coeficiente de reparto (%)",
      options: {
        display: "excluded",
      },
    },
    {
      name: "owner",
      label: "Titular",
      options: {
        display: "true",
      },
    },
    {
      name: "status",
      label: "",
      options: {
        display: "excluded",
      },
    },
    {
      name: "actions",
      label: "",
      options: {
        display: "excluded",
      },
    },
  ];

  function CustomToolbar() {
    return (
      <React.Fragment>
        <Tooltip title={"custom icon"}>
          <Button
            id="toolbar-custom-buttons"
            startIcon={<AddIcon />}
            variant="contained"
            className="h-full"
          >
            NUEVO
          </Button>
        </Tooltip>
      </React.Fragment>
    );
  }

  const options: MUIDataTableOptions = {
    tableId: "collapsible-table",
    filter: true,
    onFilterChange: (changedColumn, filterList) => {
      console.log(changedColumn, filterList);
    },
    selectableRows: undefined,
    filterType: "checkbox",
    responsive: "simple",
    rowsPerPage: 10,
    expandableRows: true,
    customToolbar: CustomToolbar,
    renderExpandableRow: (rowData, rowMeta) => {
      console.log(rowData, rowMeta);
      return (
        <React.Fragment>
          <TableRow>
            <TableCell colSpan={6} sx={{ py: "0 !important" }}>
              <Typography variant="h6" gutterBottom component="div">
                Otros Datos
              </Typography>
              <Box sx={{ m: 2 }}>
                <Table size="small" aria-label="purchases">
                  <TableBody>
                    <TableRow>
                      <TableCell align="left">
                        Dirección: {rowData[1]}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="left">
                        Coef.Reparto: {rowData[2]}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="left">Titular:{rowData[3]}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </TableCell>
          </TableRow>
        </React.Fragment>
      );
    },
    page: 1,
  };

  return (
    <S.StyledCollapsibleMUIDataTable
      title={""}
      data={rows}
      columns={columns}
      options={options}
    />
  );
};

export default ExpandableRowTable;
