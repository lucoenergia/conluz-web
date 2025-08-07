import { useState, type FC } from "react"
import { Box } from "@mui/material"
import { useParams } from "react-router";
import { CardList } from "../../components/cardList/CardList";
import { GraphCard } from "../../components/graphCard/GraphCard";
// import { LoadingGraphCard } from "../../components/graphCard/LoadingGraphCard";
import { GraphBar } from "../../components/graph/GraphBar";

export const SupplyDetailPage: FC = () => {
  let { supplyPointId } = useParams();
const timeRangeData:string = 'year';


const measurementData = [
  {
    name:  'Producción Asignada',
    value:  [],
  },
   {
    name: 'Consumo de red',
    value: [], 
  },
  {
    name: 'Autoconsumo',
    value:  [], 
  },
  {
    name: 'Excedente',
    value: [], 
  }
]

const assignedProdText:string = 'Cantidad de energía generada por la comunidad que te ha sido asignada a este punto de suministro en base a su coeficiente de reparto'
const networkUsage:string = 'Cantidad de energía consumida de la red'
const selfConsumption:string = 'Cantidad de energía autoconsumida'
const excedent:string = 'Cantidad de energía no consumida'

return <Box className='flex flex-col'>
      {/* <CardList className='flex flex-row flex-wrap'> */}
      <CardList className='flex flex-row w-full' pagination='hidden' ulStyles='w-full'>

      {measurementData.map((item) => (
        <GraphCard 
          title={item.name} 
          infoText={
            item.name === 'Producción Asignada' ? assignedProdText :
            item.name === 'Consumo de red' ? networkUsage :
            item.name === 'Autoconsumo' ? selfConsumption :
            item.name === 'Excedente' ? excedent : ''
          }
          className="flex flex-col md:w-1/2 h-80 m-[20px] p-2">
            <GraphBar className="mt-auto" timeRangeData={timeRangeData}></GraphBar>            
        </GraphCard>
      ))}
    </CardList>
  {/* {!isLoading && !error &&

  }
  {isLoading &&
    <CardList>
      {
        Array.from({ length: 5}).map(() => <LoadingGraphCard/>)
      }
    </CardList>
  }   */}
</Box>
}