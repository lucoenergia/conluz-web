import { useCallback, type FC } from "react";
import { GraphCard } from "./GraphCard";
import { GraphBar } from "./GraphBar";

interface GraphProps {
    item: {
        name: string,
        value: number[],
        info: string
    },
    timeRangeData:string
}
export const Graph:FC<GraphProps> = ({item,timeRangeData}) => {
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

    
return <>
    <GraphCard 
        title={item.name} 
        infoText={item.info}
    >
        <GraphBar className="mt-auto" timeRangeData={timeRangeData} title={item.name} categories={categories} data={getData()}></GraphBar>            
    </GraphCard>
</>
}
