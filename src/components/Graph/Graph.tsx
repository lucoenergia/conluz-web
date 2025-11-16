import { type FC } from "react";
import { GraphCard } from "./GraphCard";
import { GraphBar } from "./GraphBar";

interface GraphProps {
  title: string;
  subtitle?: string;
  values: number[];
  xAxis: string[] | number[];
  info: string;
  variant?: "production" | "consumption" | "default";
}

export const Graph: FC<GraphProps> = ({
  title,
  subtitle,
  values,
  xAxis,
  info,
  variant = "default"
}) => {
  return (
    <GraphCard
      title={title}
      subtitle={subtitle}
      infoText={info}
      variant={variant}
    >
      <GraphBar
        title={title}
        categories={xAxis}
        data={values}
        variant={variant}
      />
    </GraphCard>
  );
};