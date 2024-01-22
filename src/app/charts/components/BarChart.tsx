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

const BarChart = () => {
  // ** Hook
  const theme = useTheme();

  const options: ApexOptions = {
    title: {
      text: "kWh per day",
      align: "left",
      offsetX: -10,
    },
    chart: {
      type: "bar",
      height: 350,
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
    },
    grid: {
      padding: {
        top: -1,
        right: 0,
        left: 5,
        bottom: 5,
      },
    },
    colors: [
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
      theme.palette.primary.main,
    ],
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: "55%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: [
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
      ],
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return "$ " + val + " thousands";
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
        title="Bar Chart"
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

export default BarChart;
