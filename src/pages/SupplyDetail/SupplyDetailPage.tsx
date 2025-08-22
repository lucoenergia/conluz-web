import { type FC } from "react"
import { Box } from "@mui/material"
import { useParams } from "react-router";
import { Graph } from "../../components/graph/Graph.component";
import { LoadingGraphCard } from "../../components/graph/LoadingGraphCard";

export const SupplyDetailPage: FC = () => {
let { supplyPointId } = useParams();
const timeRangeData:string = 'month';

const { 
  data: measurementApiData, 
  isLoading, 
  error 
} = useGetSupplyMeasurements({ supplyPointId, timeRange: timeRangeData });



const measurementData = [
  {
    name:  'Producción Asignada',
    value:  [],
    info: 'Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto'
  },
   {
    name: 'Consumo de red',
    value: [], 
    info: 'Cantidad de energía consumida de la red'
  },
  {
    name: 'Autoconsumo',
    value:  [], 
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
        {measurementData.map((item) => (
          <Graph item={item} timeRangeData={timeRangeData}/>
        ))}
      }
      {isLoading &&
        {
          Array.from({ length: 5}).map(() => <LoadingGraphCard/>)
        }
      }
    </Box>
</Box>
}