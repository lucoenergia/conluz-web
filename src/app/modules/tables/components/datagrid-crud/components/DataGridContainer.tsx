import * as React from "react";
import Box from "@mui/material/Box";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import {
  GridRowModesModel,
  GridRowModes,
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridEventListener,
  GridRowId,
  GridRowModel,
  GridRowEditStopReasons,
  gridPageCountSelector,
  gridPageSelector,
  useGridApiContext,
  useGridSelector,
  GridActionsCellItemProps,
  GridValidRowModel,
} from "@mui/x-data-grid";
import DataGridCustomPagination from "./DataGridCustomPagination";
import DataGridToolbarContent from "./DataGridToolbarContent";
import { DataGridContainerProps } from "./types";
import { JSXElementConstructor, ReactElement } from "react";

export default function DataGridContainer(props: DataGridContainerProps) {
  // ** Props
  const { columnDefinitions, initialRows, actions } = props;

  const [rows, setRows] = React.useState(initialRows);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {}
  );

  //TODO: add controller for this component with the functions below
  const handleRowEditStop: GridEventListener<"rowEditStop"> = (
    params,
    event
  ) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const processRowUpdate = (newRow: GridRowModel) => {
    const updatedRow = { ...newRow, isNew: false };
    setRows(rows.map((row) => (row.id === newRow.id ? updatedRow : row)));
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const columns: GridColDef[] = getColumnCellItems(
    columnDefinitions,
    actions,
    rows,
    setRows,
    rowModesModel,
    setRowModesModel
  );

  function CustomToolbar() {
    return (
      <DataGridToolbarContent
        setRows={setRows}
        setRowModesModel={setRowModesModel}
      />
    );
  }

  function CustomPagination() {
    const apiRef = useGridApiContext();
    const page = useGridSelector(apiRef, gridPageSelector);
    const pageCount = useGridSelector(apiRef, gridPageCountSelector);

    return (
      <DataGridCustomPagination
        apiRef={apiRef}
        page={page}
        pageCount={pageCount}
      />
    );
  }

  return (
    <Box className="h-[30rem] w-full overflow-hidden">
      <DataGrid
        autoPageSize
        rows={rows}
        columns={columns}
        localeText={{
          toolbarExport: "exportar",
          toolbarQuickFilterPlaceholder: "",
        }}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={handleRowModesModelChange}
        onRowEditStop={handleRowEditStop}
        processRowUpdate={processRowUpdate}
        slots={{
          toolbar: CustomToolbar,
          pagination: CustomPagination,
        }}
      />
    </Box>
  );
}

function getColumnCellItems(
  _columnDefinitions: GridColDef[],
  _actionsColumn:
    | ReactElement<
        GridActionsCellItemProps,
        string | JSXElementConstructor<any>
      >[]
    | undefined,
  _rows: readonly GridValidRowModel[],
  _setRows: any,
  _rowModesModel: GridRowModesModel,
  _setRowModesModel: any
) {
  if (_actionsColumn) {
    const actionsCellItem: GridColDef = {
      field: "actions",
      type: "actions",
      headerName: "Operaciones",
      flex: 1,
      headerClassName: "super-app-theme--header",
      align: "left",
      headerAlign: "left",
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = _rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return getEditModeColumnCellItems(
            id,
            _rows,
            _setRows,
            _rowModesModel,
            _setRowModesModel
          );
        }

        return _actionsColumn;
      },
    };

    return [..._columnDefinitions, actionsCellItem];
  }

  return _columnDefinitions;
}

function getEditModeColumnCellItems(
  _id: GridRowId,
  _rows: readonly GridValidRowModel[],
  _setRows: any,
  _rowModesModel: GridRowModesModel,
  _setRowModesModel: any
) {
  const handleSaveClick = (id: GridRowId) => () => {
    _setRowModesModel({ ..._rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    _setRowModesModel({
      ..._rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = _rows.find((row) => row.id === id);
    if (editedRow!.isNew) {
      _setRows(_rows.filter((row) => row.id !== id));
    }
  };

  return [
    <GridActionsCellItem
      key="1"
      icon={<SaveIcon />}
      label="Save"
      sx={{
        color: "primary.main",
      }}
      onClick={handleSaveClick(_id)}
    />,
    <GridActionsCellItem
      key="2"
      icon={<CancelIcon />}
      label="Cancel"
      className="textPrimary"
      onClick={handleCancelClick(_id)}
      color="inherit"
    />,
  ];
}
