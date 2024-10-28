"use client";

import { useEffect, useState } from "react";

// ** MUI Imports
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";

import apiClient from "../../shared/restApi/apiClient";
import { getTodayStartOfDay, getTodayEndOfDay, formatDate, getHourFromStringDatetime } from "../../shared/date/dateUtil";


import dynamic from 'next/dynamic';
import { ApexOptions } from "apexcharts";
import chartI18nLocale from '../../shared/charts/apexcharts/i18n/es.json';
// Dynamically import ApexCharts with SSR disabled for Next.js compatibility
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const EnergyProductionTodaySummary = () => {
  // ** Hook
  // const theme = useTheme();

  const chartOptions: ApexOptions = {
    chart: {
      id: "chart-production",
      locales: [chartI18nLocale],
      defaultLocale: 'es',
      dropShadow: {
        enabled: true,
        color: '#000',
        top: 18,
        left: 7,
        blur: 10,
        opacity: 0.2
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        dataLabels: {
          position: 'top', // top, center, bottom
        },
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      row: {
        colors: ['#e5e5e5', 'transparent'],
        opacity: 0.5
      },
      column: {
        colors: ['#f8f8f8', 'transparent'],
      },
      xaxis: {
        lines: {
          show: true
        }
      }
    },
    colors: ['rgb(238, 177, 17)'],
    markers: {
      size: 1
    },
    stroke: {
      curve: 'smooth'
    },
    xaxis: {
      type: 'category',
      labels: {
        formatter: function (value) {
          return Math.ceil(value) + "h";
        }
      },
      min: 0,
      max: 23,
      tickAmount: 6,
      tooltip: {
        enabled: false
      },
    },
    yaxis: {
      type: 'category',
      title: {
        text: 'Energía producida en kWh'
      },
      min: 0,
      max: 65,
      labels: {
        formatter: function (value) {
          return value + "kWh";
        }
      },
    },
  };

  const [series, setSeries] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchProduction = async () => {
      try {
        const startDate = getTodayStartOfDay();
        const endDate = getTodayEndOfDay();

        const response = await apiClient.get("/production/hourly", {
          params: {
            startDate: startDate, // Example: "2024-06-15T00:00:00.000+02:00"
            endDate: endDate // Example: "2024-06-15T23:59:00.000+02:00"
          }
        });

        if (response.status === 200) {

          setSeries(
            response.data.map((item: any) => {
              const power = (item.power < 0) ? 0.0 : parseFloat(parseFloat(item.power)).toFixed(2);
              console.log("item.time -> " + item.time)
              const time = getHourFromStringDatetime(item.time)
              console.log("time -> " + time)
              return [time, power]
            })
          );
        }
      } catch (error) {
        console.error("Failed to fetch energy production for today: ", error);
      }
    };

    fetchProduction();
  }, []);

  return (
    <Card sx={{ position: "relative" }}>
      <CardContent>
        <Typography variant="h6">Energía producida el {formatDate(new Date(), 'DD/MM/yyyy')}</Typography>
        <Typography variant="body2" sx={{ letterSpacing: "0.25px" }}>
          {`Energía producida por la comunidad energética`}
          .
        </Typography>
        <CardContent
          sx={{ "& .apexcharts-xcrosshairs.apexcharts-active": { opacity: 0 } }}
        >
          <ApexChart type="bar" options={chartOptions} series={[{ name: 'Energía en kWh', data: series }]} width={"100%"} height={350} />
          <Box sx={{ mb: 7, display: "flex", alignItems: "center" }}>
          </Box>
          <Button fullWidth variant="contained">
            Ver producción de energía
          </Button>
        </CardContent>
      </CardContent>
    </Card>
  );
};

export default EnergyProductionTodaySummary;
