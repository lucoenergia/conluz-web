"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TableSortingSelecting, {
  createData,
} from "../tables/components/TableSortingSelecting";
import { Box } from "@mui/material";
import TableCollapsible from "../tables/components/TableCollapsible";

// ** Other Imports
import SearchBar from "../shared/components/search-bar/SearchBar";
import { useEffect, useState } from "react";
import axios from "axios";

import apiClient from "../shared/restApi/apiClient";

interface SupplyDTO {
  id: number;
  cups: string;
  address: string;
  distributionCoefficient: number;
  owner: string;
  status: string;
  actions: string;
}

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

  const fetchSupplyPointsData = async () => {
    try {
      const response = await apiClient.get("/supplies", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {}, // Añadir cuerpo vacío para solucionar error de "Content-Type vacío"
      });

      const supplies = transformToRows(response.data.items);
      setFilteredRows(supplies);
    } catch (error: any) {
      //Add the code associated with error handling
    }
  };

  const transformToRows = (_supplies: any[]): SupplyDTO[] => {
    return _supplies.map((supply) =>
      createData(
        supply.id,
        supply.code,
        supply.address,
        supply.partitionCoefficient,
        supply.user.fullName,
        "active",
        ""
      )
    );
  };

  useEffect(() => {
    const initSupplies = async () => {
      const supplies = await fetchSupplyPointsData();
    };

    initSupplies();
  }, []);

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
            <Grid container marginBottom={5} justifyContent="flex-end">
              <Grid
                item
                sm={6}
                mx="2"
                sx={{
                  display: { xs: "none", sm: "block" },
                }} // This search bar is shown for screens > 600px
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
