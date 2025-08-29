import { useMemo, type FC } from "react";
import Chart from "react-apexcharts";
interface GraphBarProps {
  title: string,
  categories: string[] | number[],
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
      },
  }}), [categories]); 

const series = useMemo(() => [
    {
      name: title,
      data: data // El valor que corresponde a cada barra
    }
  ], [data, title]); 


  return (
          <Chart
            options={options}
            series={series}
            type="bar"
          />
  );
};
