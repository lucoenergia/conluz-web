import { useCallback, type FC } from "react"
import { Box } from "@mui/material"
import { useParams } from "react-router";
import { LoadingGraphCard } from "../../components/graph/LoadingGraphCard";
import { Graph } from "../../components/graph/Graph";

export const SupplyDetailPage: FC = () => {
  let { supplyPointId } = useParams();
  const timeRangeData: string = 'month';

  const {
    data: measurementApiData,
    isLoading,
    error
  } = { data: {}, isLoading: false, error: undefined }

  const categories =
    timeRangeData === 'day' ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] :
      timeRangeData === 'month' ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] :
        ['2021', '2022', '2023', '2024', '2025'];

  const getData = useCallback(() => {
    if (timeRangeData === 'day') {
      return [30, 40, 45, 50, 49, 60, 70]; // mocked data para 7 días
    } else if (timeRangeData === 'month') {
      return [30, 40, 45, 50, 49, 60, 70, 91, 35, 45, 55, 65]; //mocked data para 12 meses
    } else {
      return [30, 40, 45, 50, 49]; // mocked data para 5 años
    }
  }, [timeRangeData]);


  const measurementData = [
    {
      name: 'Producción Asignada',
      value: [],
      info: 'Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto'
    },
    {
      name: 'Consumo de red',
      value: [],
      info: 'Cantidad de energía consumida de la red'
    },
    {
      name: 'Autoconsumo',
      value: [],
      info: 'Cantidad de energía autoconsumida'
    },
    {
      name: 'Excedente',
      value: [],
      info: 'Cantidad de energía no consumida'
    }
  ]


  return <Box className='flex flex-col'>
    <Box className='grid md:grid-cols-2 gap-4'>
      {!isLoading && !error &&
        measurementData.map((item) => (
          <Graph title={item.name} values={getData()} xAxis={categories} info={item.info}  />
        ))
      }
      {isLoading &&
        Array.from({ length: 4 }).map(() => <LoadingGraphCard />)
      }
    </Box>
  </Box>
}
