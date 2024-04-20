import { styled } from "@mui/material/styles";
import MUIDataTable from "mui-datatables";

export const StyledCollapsibleMUIDataTable = styled(MUIDataTable)(
  ({ theme }) => ({
    ".MuiTableHead-root .MuiTableCell-head ": {
      backgroundColor: "#F9FAFC",
    },

    ".MuiTableCell-root": {
      textAlign: "left",
      paddingLeft: "0",
    },
  })
);
