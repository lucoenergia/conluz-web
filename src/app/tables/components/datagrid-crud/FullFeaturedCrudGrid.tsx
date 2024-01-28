import * as React from "react";
import Box from "@mui/material/Box";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import DotsVertical from "mdi-material-ui/DotsVertical";
import {
  GridRowsProp,
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
} from "@mui/x-data-grid";
import { faker } from "@faker-js/faker";
import DataGridCustomPagination from "./components/DataGridCustomPagination";
import DataGridToolbarContent from "./components/DataGridToolbarContent";

const initialRows: GridRowsProp = [
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
  {
    id: faker.string.numeric(3),
    name: faker.person.firstName(),
    firstSurname: faker.person.lastName(),
    secondSurname: faker.person.lastName(),
  },
];

export default function FullFeaturedCrudGrid() {
  const [rows, setRows] = React.useState(initialRows);
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {}
  );

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (
    params,
    event
  ) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleDeleteClick = (id: GridRowId) => () => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow!.isNew) {
      setRows(rows.filter((row) => row.id !== id));
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

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Nombre",
      flex: 1,
      editable: true,
      headerClassName: "super-app-theme--header",
      align: "left",
      headerAlign: "left",
    },
    {
      field: "firstSurname",
      headerName: "Primer Apellido",
      type: "string",
      flex: 1,
      align: "left",
      headerAlign: "left",
      editable: true,
      headerClassName: "super-app-theme--header",
    },
    {
      field: "secondSurname",
      headerName: "Segundo Apellido",
      type: "string",
      flex: 1,
      editable: true,
      headerClassName: "super-app-theme--header",
      align: "left",
      headerAlign: "left",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Operaciones",
      flex: 1,
      headerClassName: "super-app-theme--header",
      align: "left",
      headerAlign: "left",
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              key="1"
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: "primary.main",
              }}
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              key="2"
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        return [
          <GridActionsCellItem
            key="3"
            icon={<EditIcon />}
            label="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
          <GridActionsCellItem
            key="4"
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteClick(id)}
            color="inherit"
          />,
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
