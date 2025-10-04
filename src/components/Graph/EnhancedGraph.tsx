import { type FC } from "react";
import { EnhancedGraphCard } from "./EnhancedGraphCard";
import { EnhancedGraphBar } from "./EnhancedGraphBar";

interface EnhancedGraphProps {
  title: string;
  subtitle?: string;
  values: number[];
  xAxis: string[] | number[];
  info: string;
  variant?: "production" | "consumption" | "default";
}

export const EnhancedGraph: FC<EnhancedGraphProps> = ({
  title,
  subtitle,
  values,
  xAxis,
  info,
  variant = "default"
}) => {
  return (
    <EnhancedGraphCard
      title={title}
      subtitle={subtitle}
      infoText={info}
      variant={variant}
    >
      <EnhancedGraphBar
        title={title}
        categories={xAxis}
        data={values}
        variant={variant}
      />
    </EnhancedGraphCard>
  );
};