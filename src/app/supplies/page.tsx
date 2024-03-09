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

// ** Demo Components Imports

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
              <Grid item xs={8}>
                <Typography variant="body1">
                  Botón Nuevo Punto de Suministro
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body1">Buscador</Typography>
              </Grid>

              {/* Segunda fila con una columna */}
              <Grid container xs={12} justifyContent="center">
                <Typography variant="body1">
                  Cards con los puntos de suministro
                </Typography>
              </Grid>

              {/* Tercera fila con una columna */}
              <Grid container xs={12} justifyContent="center">
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
