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

const LineChart = () => {
  // ** Hook
  const theme = useTheme();

  const options: ApexOptions = {
    chart: {
      height: 405,
      type: "line",
      zoom: {
        enabled: false,
      },
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
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "straight",
    },
    title: {
      text: "€/MWh",
      align: "left",
      offsetX: -10,
    },
    colors: [theme.palette.primary.main],
    grid: {
      row: {
        colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
        opacity: 0.5,
      },
      padding: {
        top: -1,
        right: 0,
        left: 5,
        bottom: 5,
      },
    },
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
    },
    yaxis: {
      labels: {
        offsetX: -17,
        formatter: (value) =>
          `${value > 999 ? `${(value / 1000).toFixed(0)}` : value}`,
      },
    },
  };

  const series: ApexAxisChartSeries = [
    {
      name: "€/MWh",
      data: [10, 41, 35, 51, 49, 62, 69, 91, 148],
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Line Chart"
        subheader="Energy Price"
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
          type="line"
          height={405}
          width={"100%"}
          options={options}
          series={series}
        />
      </CardContent>
    </Card>
  );
};

export default LineChart;
