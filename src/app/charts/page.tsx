"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

// ** Demo Components Imports
import BarChart from "./components/ColumnChart";
import LineChart from "./components/LineChart";
import MixedLineBarChart from "./components/MixedLineBarChart";
import BarStackedChart from "./components/BarStackedChart";
import ColumnChart from "./components/BarChart";
import GaugeChart from "./components/GaugeChart";

const CardBasic = () => {
  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant="h5">
          <Link href="https://mui.com/components/tables/" target="_blank">
            Apex Charts
          </Link>
        </Typography>
        <Typography variant="body2">
          <Link href="https://apexcharts.com/react-chart-demos/radialbar-charts/semi-circle-gauge/">
            react-apexcharts
          </Link>{" "}
          library used in the examples listed below.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <BarChart />
      </Grid>
      <Grid item xs={12}>
        <ColumnChart />
      </Grid>
      <Grid item xs={12}>
        <LineChart />
      </Grid>
      <Grid item xs={12}>
        <MixedLineBarChart />
      </Grid>
      <Grid item xs={12}>
        <BarStackedChart />
      </Grid>
      <Grid item xs={12}>
        <GaugeChart />
      </Grid>
    </Grid>
  );
};

export default CardBasic;
