"use client";

// ** React Imports
import * as React from "react";

// ** MUI Imports
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import TableSortingSelecting, {
  createData,
} from "../tables/components/TableSortingSelecting";
import { Box } from "@mui/material";
import TableCollapsible from "../tables/components/TableCollapsible";

// ** Other Imports
import SearchBar from "../shared/components/search-bar/SearchBar";
import { useState } from "react";

const rows = [
  createData(1, "ES00111", "Calle Falsa 111", 3.076, "Alexa", "activo", ""),
  createData(2, "ES00222", "Calle Falsa 222", 3.076, "Marco ", "inactivo", ""),
  createData(3, "ES00333", "Calle Falsa 333", 3.076, "Juan", "inactivo", ""),
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
            {/* Primera fila con dos columnas */}
            <Grid container marginBottom={5}>
              <Grid
                item
                sm={6}
                sx={{ display: { xs: "none", sm: "block" } }} // This search bar is shown for screens > 600px
              >
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
              </Grid>
              <Grid
                item
                xs={4}
                sx={{ display: { xs: "block", sm: "none" } }} // This search bar is shown for screens < 600px
              >
                <Button variant="contained">
                  <Typography
                    variant="button"
                    sx={{
                      fontSize: { xs: 10, sm: 10 },
                    }}
                  >
                    N
                  </Typography>
                </Button>
              </Grid>
              <Grid
                item
                sm={6}
                mx="2"
                sx={{ display: { xs: "none", sm: "block" } }} // This search bar is shown for screens > 600px
              >
                <SearchBar
                  onSearch={handleSearch}
                  onClearInput={handleClearSearchInput}
                />
              </Grid>
              <Grid
                item
                xs={8}
                sx={{ display: { xs: "block", sm: "none" } }} // This search bar is shown for screens < 600px
                mx="2"
              >
                <SearchBar
                  onSearch={handleSearch}
                  onClearInput={handleClearSearchInput}
                />
              </Grid>
            </Grid>

            {/* Segunda fila con una columna */}
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <TableSortingSelecting rows={filteredRows} />
            </Box>
            <Box sx={{ display: { xs: "block", sm: "none" } }}>
              <TableCollapsible rows={filteredRows} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
export default MUITable;
