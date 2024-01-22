"use client";

// ** MUI Imports
import Card from "@mui/material/Card";
import { useTheme } from "@mui/material/styles";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";

// ** Third Party Imports
import { ApexOptions } from "apexcharts";

// ** React Imports
import ReactApexcharts from "@/app/shared/components/react-apexcharts/ReactApexcharts";

const ColumnChart = () => {
  // ** Hook
  const theme = useTheme();

  const options: ApexOptions = {
    title: {
      text: "kWh per day",
      align: "left",
      offsetX: -10,
    },
    chart: {
      parentHeightOffset: 0,
      toolbar: {
        show: true,
        offsetX: 0,
        offsetY: -70,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
          customIcons: [],
        },
        export: {
          csv: {
            filename: "GeneratedEnergyPerDay",
            columnDelimiter: ",",
            headerCategory: "Day",
            headerValue: "value",
            dateFormatter(timestamp: number) {
              return new Date(timestamp).toDateString();
            },
          },
          svg: {
            filename: "GeneratedEnergyPerDay",
          },
          png: {
            filename: "GeneratedEnergyPerDay",
          },
        },
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: "55%",
      },
    },
    stroke: {
      width: 2,
      colors: [theme.palette.background.paper],
    },
    legend: { show: false },
    grid: {
      strokeDashArray: 7,
      padding: {
        top: -1,
        right: 0,
        left: 5,
        bottom: 5,
      },
    },
    dataLabels: { enabled: false },
    colors: [
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
    ],
    states: {
      hover: {
        filter: { type: "none" },
      },
      active: {
        filter: { type: "none" },
      },
    },
    xaxis: {
      categories: ["1", "4", "8", "12", "16", "20", "24"],
      tickPlacement: "on",
      labels: { show: true },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    yaxis: {
      show: true,
      tickAmount: 3,
      labels: {
        offsetX: -15,
        formatter: (value) =>
          `${value > 999 ? `${(value / 1000).toFixed(0)}` : value}`,
      },
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val + " kWh/day";
        },
      },
    },
  };

  const series: ApexAxisChartSeries = [
    {
      name: "Generated Energy",
      data: [0, 0.2, 0.7, 0, 1.5, 1, 0],
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Column Chart"
        subheader="Quantity of generated energy"
        titleTypographyProps={{
          sx: {
            lineHeight: "2rem !important",
            letterSpacing: "0.15px !important",
          },
        }}
      />
      <CardContent
        sx={{ "& .apexcharts-xcrosshairs.apexcharts-active": { opacity: 0 } }}
      >
        <ReactApexcharts
          type="bar"
          height={405}
          width={"100%"}
          options={options}
          series={series}
        />
      </CardContent>
    </Card>
  );
};

export default ColumnChart;
