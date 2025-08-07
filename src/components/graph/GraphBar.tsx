import { Box } from "@mui/material";
import { BarChart, BarPlot, ChartsXAxis, LinePlot, type BarChartProps } from "@mui/x-charts";
import { ChartContainer } from '@mui/x-charts/ChartContainer';
import type { FC } from "react";

interface GraphBarProps {
  className: string,
  timeRangeData: string
}
export const GraphBar: FC<GraphBarProps> = ({className, timeRangeData}) => {
  // Esta data tiene que llegarle por props en función del filtro:
const datasetWeek = [
  {
    energy: 0.3,
    day: 'L',
  },
  {
    energy: 1.4,
    day: 'M'
  }, {
    energy: 1,
    day: 'X'
  }, {
    energy: 0.2,
    day: 'J'
  },
  {
    energy: 0.7,
    day: 'V'
  }, {
    energy: 0.4,
    day: 'S'
  }, {
    energy: 0.9,
    day: 'D'
  }
]

const datasetMonth = [
  {
    energy: 41,
    month: 'Ene',
  },
  {
    energy: 42,
    month: 'Feb'
  }, {
    energy: 41,
    month: 'Mar'
  }, {
    energy: 40,
    month: 'Abr'
  },
  {
    energy: 41,
    month: 'May'
  }, {
    energy: 34,
    month: 'Jun'
  }, {
    energy: 37,
    month: 'Jul'
  },{
    energy: 35,
    month: 'Ago'
  }, {
    energy: 33,
    month: 'Sep'
  }, {
    energy: 29,
    month: 'Oct'
  }, {
    energy: 40,
    month: 'Nov'
  }, {
    energy: 38,
    month: 'Dic'
  },
  
]

const datasetYear = [
  {
    energy: 1340,
    year: '2021',
  }, {
    energy: 1112,
    year: '2022',
  },  {
    energy: 1340,
    year: '2023',
  }, {
    energy: 1200,
    year: '2024',
  },   {
    energy: 1250,
    year: '2025',
  }
]

const dataset: any[]= timeRangeData === 'day' ? datasetWeek :
                timeRangeData === 'month' ? datasetMonth :
                datasetYear

const valueFormatter = (value: number | null) => {
  return `${value}kWh`;
}

const config: Partial<BarChartProps> = {
  height: 200,
   yAxis: [
    {
      label: 'kWh',
      width: 50,
      min: 0,
      max: (
        timeRangeData === 'day' ? 1.5 :
        timeRangeData === ' month' ? 56 : 1500 ),
      tickInterval: (
        timeRangeData === 'day' ? [0, 0.5, 1, 1.5] :
        timeRangeData === 'month' ? [0, 14, 28, 42] : [0, 450, 900, 1350]
      ),
      tickNumber: 4    } 
  ],
  margin: { left: 0 },
  hideLegend: true,
};

return <Box className={className}>
        <BarChart
            dataset={dataset}
            //aquí ver cómo viene la data y quizá hacer un map para seleccionar la datakey
            xAxis={[{ scaleType: 'band', dataKey: (
              timeRangeData === 'day' ? 'day' :
              timeRangeData === 'month' ? 'month' : 'year'  ) 
            }]}
            series={[
                {
                  dataKey: 'energy',
                  label: 'Energía',
                  valueFormatter,
                }
            ]}
            {...config}
        />
</Box>
}