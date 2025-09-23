import { type FC } from "react";
import { CardTemplate } from "../CardTemplate/CardTemplate";
import { Stat } from "../Stat/Stat";

interface Stat {
  label: string;
  value: string;
}

interface StatsCardProps {
  stats: Stat[];
}

export const StatsCard: FC<StatsCardProps> = ({ stats }) => {
  return (
    <CardTemplate className={`p-4 flex flex-wrap flex-row justify-center`}>
      {stats.map((stat, index) => (
        <Stat
          className="basis-1/3 text-center self-center"
          variant="big"
          key={index}
          label={stat.label}
          value={stat.value}
        />
      ))}
    </CardTemplate>
  );
};
