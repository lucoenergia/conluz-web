import { useMemo, type FC } from "react";
import Chart from "react-apexcharts";
interface GraphBarProps {
  timeRangeData: string,
  title: string,
  className?: string,
  categories: string[],
  data: number[]
}

export const GraphBar: FC<GraphBarProps> = ({title, categories, data}) => {
  const options = useMemo(() => ({
    chart: {
      id: "basic-bar",
      toolbar: {
        show: false
      },
      redrawOnWindowResize: true,
      animations: {
        enabled: false
      }
    },
    xaxis: {
      categories: categories
    },
    yaxis: {
      title: {
        text: 'kWh', 
        style: {
          fontSize: '8px',
        },
        offsetX: 5,
      },
      min: 0,
      max: undefined, // undefined para automático, o un número específico
      tickAmount: 5,    // Número de marcas en el eje
      stepSize: 10,   // Intervalo entre valores -> esto va a depender del timeRangeData y de la data que entre (necesitamos los models)
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: true
      },
  }}), [categories]); 

const series = useMemo(() => [
    {
      name: title,
      data: data // El valor que corresponde a cada barra
    }
  ], [data, title]); 


  return (
        <div className="mixed-chart">
          <Chart
            options={options}
            series={series}
            type="bar"
            width='100%'
            height='100%'
          />
        </div>
  );
};
