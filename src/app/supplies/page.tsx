"use client";
// ** React Imports
import * as React from "react";
// ** MUI Imports
import { styled } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import TableSortingSelecting from "../tables/components/TableSortingSelecting";
import { Box } from "@mui/material";
import TableCollapsible from "../tables/components/TableCollapsible";

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  marginLeft: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "right",
  [theme.breakpoints.up("sm")]: {
    border: `1px solid ${theme.palette.primary.main}`,
    display: "flex",
    justifyContent: "left",
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));
const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(0, 2),
    marginLeft: theme.spacing(2),
    width: "auto",
  },
}));
const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  height: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(8)})`,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));
const MUITable = () => {
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
              <Grid item xs={10} sm={6}>
                <Button variant="contained">
                  <Typography
                    variant="button"
                    sx={{ fontSize: { xs: 10, sm: 10 } }}
                  >
                    Nuevo punto de suministro
                  </Typography>
                </Button>
              </Grid>
              <Grid
                item
                sm={6}
                mx="2"
                sx={{ display: { xs: "none", sm: "block" } }} // This search bar is shown for screens > 600px
              >
                <Search>
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                  <StyledInputBase
                    placeholder="Search…"
                    inputProps={{ "aria-label": "search" }}
                  />
                </Search>
              </Grid>
              <Grid
                item
                xs={2}
                sx={{ display: { xs: "block", sm: "none" } }} // This search bar is shown for screens < 600px
                mx="2"
              >
                <Search>
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                </Search>
              </Grid>
            </Grid>

            {/* Segunda fila con una columna */}
            <TableSortingSelecting></TableSortingSelecting>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <TableSortingSelecting></TableSortingSelecting>
            </Box>
            <Box sx={{ display: { xs: "block", sm: "none" } }}>
              <TableCollapsible />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
export default MUITable;
