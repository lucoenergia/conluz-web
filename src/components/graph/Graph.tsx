import { type FC } from "react";
import { GraphCard } from "./GraphCard";
import { GraphBar } from "./GraphBar";

interface GraphProps {
  title: string,
  values: number[],
  xAxis: string[] | number[]
  info: string
}
export const Graph: FC<GraphProps> = ({ title, values, xAxis, info }) => {


  return <>
    <GraphCard
      title={title}
      infoText={info}
    >
      <GraphBar title={title} categories={xAxis} data={values}></GraphBar>
    </GraphCard>
  </>
}
