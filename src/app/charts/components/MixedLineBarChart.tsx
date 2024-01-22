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

const MixedLineBarChart = () => {
  // ** Hook
  const theme = useTheme();

  const options: ApexOptions = {
    chart: {
      height: 350,
      type: "line",
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
    stroke: {
      width: [0, 4],
      colors: [theme.palette.common.black],
    },
    colors: [theme.palette.primary.light, theme.palette.primary.dark],
    dataLabels: {
      enabled: true,
      enabledOnSeries: [1],
    },
    grid: {
      padding: {
        top: -1,
        right: 0,
        left: -20,
        bottom: 5,
      },
    },
    labels: [
      "01 Jan 2001",
      "02 Jan 2001",
      "03 Jan 2001",
      "04 Jan 2001",
      "05 Jan 2001",
      "06 Jan 2001",
      "07 Jan 2001",
      "08 Jan 2001",
      "09 Jan 2001",
      "10 Jan 2001",
      "11 Jan 2001",
      "12 Jan 2001",
    ],
    xaxis: {
      type: "datetime",
    },
    yaxis: [
      {
        title: {
          text: "Website Blog",
        },
        labels: {
          offsetX: -23,
        },
      },
      {
        opposite: true,
        title: {
          text: "Social Media",
        },
        labels: {
          offsetX: -10,
        },
      },
    ],
  };

  const series: ApexAxisChartSeries = [
    {
      name: "Website Blog",
      type: "column",
      data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160],
    },
    {
      name: "Social Media",
      type: "line",
      data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16],
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Mixed Line and Bar Chart"
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

export default MixedLineBarChart;
