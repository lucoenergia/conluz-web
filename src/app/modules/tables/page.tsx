"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import CardHeader from "@mui/material/CardHeader";

// ** Demo Components Imports
import TableBasic from "./components/TableBasic";
import TableDense from "./components/TableDense";
import TableSpanning from "./components/TableSpanning";
import TableCustomized from "./components/TableCustomized";
import TableCollapsible from "./components/TableCollapsible";
import TableStickyHeader from "./components/TableStickyHeader";

const MUITable = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant="h5">
          <Link href="https://mui.com/components/tables/" target="_blank">
            MUI Tables
          </Link>
        </Typography>
        <Typography variant="body2">
          Tables display sets of data. They can be fully customized
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Basic Table"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableBasic />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Dense Table"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableDense />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Sticky Header"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableStickyHeader />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Collapsible Table"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableCollapsible />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Spanning Table"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableSpanning />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title="Customized Table"
            titleTypographyProps={{ variant: "h6" }}
          />
          <TableCustomized />
        </Card>
      </Grid>
    </Grid>
  );
};

export default MUITable;
