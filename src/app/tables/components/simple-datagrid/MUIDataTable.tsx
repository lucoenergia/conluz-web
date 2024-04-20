import React from "react";
import { MUIDataTableColumn, MUIDataTableOptions } from "mui-datatables";
import { Tooltip, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import * as S from "./MUIDataTable.styles";

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

const MUIDataTableView = ({ rows }: { rows: Data[] }) => {
  const columns: MUIDataTableColumn[] = [
    {
      name: "cups",
      label: "CUPS",
      options: {
        display: "true",
      },
    },
    {
      name: "address",
      label: "Dirección",
      options: {
        display: "true",
      },
    },
    {
      name: "distributionCoefficient",
      label: "Coeficiente de reparto (%)",
      options: {
        display: "true",
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
      label: "Estado",
      options: {
        display: "true",
      },
    },
    {
      name: "actions",
      label: "Acciones",
      options: {
        display: "true",
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
    expandableRows: false,
    customToolbar: CustomToolbar,
    page: 1,
  };

  return (
    <S.StyledMUIDataTable
      title={""}
      data={rows}
      columns={columns}
      options={options}
    />
  );
};

export default MUIDataTableView;
