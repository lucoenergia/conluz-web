'use client';

import { useEffect, useState } from "react";

import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

import apiClient from "../../shared/restApi/apiClient";

// Dynamically import ApexCharts with SSR disabled for Next.js compatibility
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Declare the type for chart options
type ChartOptions = {
  chart: {
    id: string;
  };
  xaxis: {
    type: string;
  },
  yaxis: {
    opposite: boolean;
  },
};

// Declare the type for series
type Series = {
  name: string;
  data: number[];
}[];

export function BasicChart() {

  const [option, setOption] = useState<ApexOptions | null>(null);
  const [series, setSeries] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await apiClient.get("/prices", {
          params: {
            startDate: "2024-06-15T00:00:00.000+02:00",
            endDate: "2024-06-15T23:59:00.000+02:00"
          }
        });

        if (response.status === 200) {          

          setSeries(
            response.data.map((item: any) => [new Date(item.hour).getTime(), item.price])
          );

          const options: ApexOptions = {
            chart: {
              id: "chart-prices",
            },
            xaxis: {
              type: 'datetime'
            },
            yaxis: {
              opposite: true
            },
          };

          setOption(options);
        }
      } catch (error) {
        console.error("Failed to fetch prices: ", error);
      }
    };

    fetchPrices();
  }, []);

  return option && series.length > 0 ? (
    <ApexChart type="line" options={option} series={[{ data: series }]} height={200} width={500} />
  ) : (
    <p>Loading...</p>
  );
}

export default BasicChart;
