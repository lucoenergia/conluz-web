"use client";

import { useEffect, useState } from "react";

// ** MUI Imports
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import { styled, useTheme } from "@mui/material/styles";

import apiClient from "../../shared/restApi/apiClient";
import { getTodayStartOfDay, getTodayEndOfDay, formatDate } from "../../shared/date/dateUtil";


import dynamic from 'next/dynamic';
import { ApexOptions } from "apexcharts";
import chartI18nLocale from '../../shared/charts/apexcharts/i18n/es.json';
// Dynamically import ApexCharts with SSR disabled for Next.js compatibility
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const EnergyPricesSummary = () => {
  // ** Hook
  // const theme = useTheme();

  const chartOptions: ApexOptions = {
    chart: {
      id: "chart-prices",
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
          const date = new Date(value);
          return formatDate(date, 'DD/MM HH:mm');
        }
      },
      tooltip: {
        enabled: false
      },
    },
    yaxis: {
      type: 'category',
      title: {
        text: 'Precio por kWh'
      },
      min: 0,
      labels: {
        formatter: function (value) {
          return value + "€";
        }
      },
    },
  };

  const [series, setSeries] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const startDate = getTodayStartOfDay();
        const endDate = getTodayEndOfDay();

        const response = await apiClient.get("/prices", {
          params: {
            startDate: startDate, // Example: "2024-06-15T00:00:00.000+02:00"
            endDate: endDate // Example: "2024-06-15T23:59:00.000+02:00"
          }
        });

        if (response.status === 200) {

          setSeries(
            response.data.map((item: any) => {
              const price = (item.price < 0) ? 0.0 : parseFloat(parseFloat(item.price)).toFixed(2);
              return [new Date(item.hour).getTime(), price]
            })
          );
        }
      } catch (error) {
        console.error("Failed to fetch prices: ", error);
      }
    };

    fetchPrices();
  }, []);

  return (
    <Card sx={{ position: "relative" }}>
      <CardContent>
        <Typography variant="h6">Precios de la energía hoy {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Typography>
        <Typography variant="body2" sx={{ letterSpacing: "0.25px" }}>
        {`Precios por hora para hoy establecidos por `}
          <Link target="_blank" href="https://www.omie.es">
            OMIE
          </Link>
          .
        </Typography>
        <CardContent
          sx={{ "& .apexcharts-xcrosshairs.apexcharts-active": { opacity: 0 } }}
        >
          <ApexChart type="line" options={chartOptions} series={[{ name: 'Precio por kWh', data: series }]} height={350} width={700} />
          <Box sx={{ mb: 7, display: "flex", alignItems: "center" }}>
          </Box>
          <Button fullWidth variant="contained">
            Ver precios de la energía
          </Button>
        </CardContent>
      </CardContent>
    </Card>
  );
};

export default EnergyPricesSummary;
