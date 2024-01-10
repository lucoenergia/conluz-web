"use client";

// ** MUI Imports
import { Theme } from "@mui/material/styles";

const DataGrid = (theme: Theme) => {
  return {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          boxShadow: theme.shadows[0],
          borderColor: "white",
          "& .MuiDataGrid-cell:focus-within": {
            outline: "none", // Removes border color of a selected cell in the table
          },
        },
        withBorderColor: {
          borderColor: theme.palette.divider, // Sets table border color
        },
        toolbarContainer: {
          textTransform: "uppercase",
          padding: "20px 20px 12px",
          "& .MuiButtonBase-root": {
            padding: "5px 8px",
            border: "1px solid rgb(238, 177, 17)",
            borderRadius: "5px",
            lineHeight: 1.71,
            letterSpacing: 0.3,
            fontWeight: 500,
          },
          "& .MuiFormControl-root": {
            // Sets search bar style
            "& .MuiInputBase-root": {
              padding: "0 10px",
              borderColor: "black",
              backgroundColor: theme.palette.customColors.searchBarBg,
              "& .MuiButtonBase-root": {
                // Sets search bar style
                border: "1px solid",
                borderRadius: "50%",
                padding: "0px 0px",
                borderColor: theme.palette.grey[300],
                backgroundColor: theme.palette.grey[300],
              },
            },
          },
        },
        footerContainer: {
          borderTop: "none",
          padding: "12px 20px 12px",
        },
        columnHeaders: {
          backgroundColor: theme.palette.customColors.tableHeaderBg,
          textTransform: "uppercase",
          "& .MuiDataGrid-columnHeader:focus-within": {
            outline: "none", // Removes border color of a selected cell in the header
          },
        },
        columnHeader: {
          paddingTop: theme.spacing(3.5),
          paddingBottom: theme.spacing(3.5),
          paddingLeft: theme.spacing(5),
          paddingRight: theme.spacing(5),
          color: theme.palette.text.primary,
          "&:hover": {
            "& .MuiDataGrid-columnSeparator": {
              opacity: "100",
            },
          },
          "&:last-child": {
            "& .MuiDataGrid-columnSeparator": {
              display: "none", // Hiddes the separator of header's last cell
            },
          },
        },
        columnHeaderTitle: {
          color: theme.palette.text.primary,
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.13px",
        },
        columnSeparator: {
          opacity: 0,
          transition: "opacity 300ms ease-linear",
        },
        main: {
          height: "100%",
          paddingTop: theme.spacing(3.5),
          paddingBottom: theme.spacing(3.5),
          "& .MuiDataGrid-cell": {
            letterSpacing: "0.25px",
            color: theme.palette.text.secondary,
          },
        },
        cell: {
          paddingTop: theme.spacing(3.5),
          paddingBottom: theme.spacing(3.5),
          paddingLeft: theme.spacing(5),
          paddingRight: theme.spacing(5),
        },
      },
    },
  };
};

export default DataGrid;
