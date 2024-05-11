"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { createData } from "../tables/components/TableSortingSelecting";
import { Box } from "@mui/material";

// ** Other Imports
import { useState } from "react";
import CollapsibleDataTable from "../tables/components/simple-datagrid/CollapsibleDataTable";
import MUIDataTableView from "../tables/components/simple-datagrid/MUIDataTable";

const rows = [
  createData(1, "ES00111", "Calle Falsa 111", 3.076, "Alex", "activo", ""),
  createData(2, "ES00222", "Calle Falsa 222", 3.076, "Marco ", "inactivo", ""),
  createData(3, "ES00333", "Calle Falsa 333", 3.076, "Juan", "inactivo", ""),
  createData(4, "ES00444", "Calle Falsa 444", 3.076, "María", "inactivo", ""),
  createData(5, "ES00555", "Calle Falsa 555", 3.076, "Teresa", "inactivo", ""),
  createData(6, "ES00666", "Calle Falsa 666", 3.076, "Ana", "inactivo", ""),
];

const MUITable = () => {
  const [filteredRows, setFilteredRows] = useState(rows);

  const handleSearch = (searchText: string) => {
    const filtered = rows.filter((row) =>
      Object.values(row).some(
        (value) => value && value.toString().toLowerCase().includes(searchText)
      )
    );
    setFilteredRows(filtered);
  };

  const handleClearSearchInput = () => {
    setFilteredRows(rows);
  };

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Breadcrumbs maxItems={2} separator="›" aria-label="breadcrumb">
          <Link underline="hover" color="inherit" href="#">
            Consumo
          </Link>
          <Link underline="always" color="primary" href="#">
            Puntos de Suministro
          </Link>
        </Breadcrumbs>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h5">
          <Link href="https://mui.com/components/tables/" target="_blank">
            Puntos de Suministro
          </Link>
        </Typography>
        <Typography variant="body2">
          Puntos de suministro registrados en la comunidad energética.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <MUIDataTableView rows={filteredRows} />
            </Box>
            <Box sx={{ display: { xs: "block", sm: "none" } }}>
              <CollapsibleDataTable rows={filteredRows} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
export default MUITable;
