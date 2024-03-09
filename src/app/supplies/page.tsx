"use client";

// ** React Imports
import * as React from "react";

// ** MUI Imports
import { styled, alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import CardContent from "@mui/material/CardContent";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";

// ** Demo Components Imports

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: "whitesmoke",
  "&:hover": {
    backgroundColor: "whitesmoke",
  },
  marginLeft: 0,
  width: "100%",
  height: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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
            <Grid container spacing={2}>
              {/* Primera fila con dos columnas */}
              <Grid container xs={12} my={2}>
                <Grid item xs={6}>
                  <Button variant="contained">Nuevo punto de suministro</Button>
                </Grid>
                <Grid item xs={6} mx="2">
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
              </Grid>

              {/* Segunda fila con una columna */}
              <Grid
                container
                xs={12}
                justifyContent="center"
                sx={{ border: "1px solid #ccc" }}
              >
                Cards con los puntos de suministro
              </Grid>

              {/* Tercera fila con una columna */}
              <Grid
                container
                xs={12}
                my={2}
                justifyContent="center"
                sx={{ border: "1px solid #ccc" }}
              >
                <Typography variant="body1">Paginación</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MUITable;
