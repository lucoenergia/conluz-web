import { styled } from "@mui/material/styles";
import MUIDataTable from "mui-datatables";

export const StyledMUIDataTable = styled(MUIDataTable)(() => ({
  ".MuiTableHead-root .MuiTableCell-head ": {
    backgroundColor: "#F9FAFC",
  },

  ".MuiTableCell-root": {
    borderBottom: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
    paddingLeft: "0",
  },

  ".MuiBox-root": {
    backgroundColor: "red",
    boxShadow: "none !important",
  },
}));
