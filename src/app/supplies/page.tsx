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
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PercentIcon from "@mui/icons-material/Percent";
import { Chip, IconButton, Pagination } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";

// ** Demo Components Imports

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.primary.main}`,
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
            {/* Primera fila con dos columnas */}
            <Grid container marginBottom={5}>
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
              my={5}
              p={2}
              justifyContent="center"
              sx={{
                border: "1px solid lightgray",
                borderRadius: "10px",
                backgroundColor: (theme) => theme.palette.grey[100],
              }}
            >
              <Grid
                item
                xs={2}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <Grid
                  container
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Grid item xs={12}>
                    <Typography variant="h4" align="center">
                      15 kWh
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" align="center">
                      (Hace 2 horas)
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                item
                xs={5}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <Grid
                  container
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Grid item xs={12}>
                    <Typography variant="h4" align="center">
                      Mi Casa
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" align="center">
                      ES00333333333333333333333333A0A
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                item
                xs={2}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <Grid
                  container
                  justifyContent="center"
                  alignItems="center"
                  height="100%"
                >
                  <Grid item xs={12}>
                    <Grid container>
                      <Grid item xs={1}>
                        <LocationOnIcon />
                      </Grid>
                      <Grid item xs={11}>
                        <Typography variant="body1" align="center">
                          Calle Falsa 123
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Grid container>
                      <Grid item xs={1}>
                        <PercentIcon />
                      </Grid>
                      <Grid item xs={11}>
                        <Typography variant="body1" align="center">
                          5,6824
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                item
                xs={2}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Chip label="activo" color="success" />
              </Grid>
              <Grid
                item
                xs={1}
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              </Grid>
            </Grid>

            {/* Tercera fila con una columna */}
            <Grid container marginTop={5} justifyContent="center">
              <Pagination
                count={10}
                variant="outlined"
                shape="rounded"
                color="primary"
              />
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MUITable;
