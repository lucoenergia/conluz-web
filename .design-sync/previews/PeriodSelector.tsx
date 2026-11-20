import { useState } from "react";
import { DAY_YEAR, LAST_12, LAST_30, LAST_7, LATEST, Mui, PeriodSelector, YEAR } from "conluz-web";

/** The member and community pages: the latest published month is September 2026. */
const MONTH_ANCHOR = { kind: "month", month: { year: 2026, month: 9 } } as const;
const MEMBER_PRESETS = [LATEST, YEAR, LAST_12];

/** The plant detail: the distributor has published up to 16 November 2026. */
const DAY_ANCHOR = { kind: "day", day: { year: 2026, month: 11, day: 16 } } as const;
const PLANT_PRESETS = [LAST_7, LAST_30, DAY_YEAR];

const Frame = ({ children }: { children: React.ReactNode }) => <Mui.Box sx={{ width: "100%", maxWidth: 420 }}>{children}</Mui.Box>;

export const LatestMonth = () => {
  const [selection, setSelection] = useState<any>({ kind: "latest" });
  return (
    <Frame>
      <PeriodSelector anchor={MONTH_ANCHOR} presets={MEMBER_PRESETS} selection={selection} onSelect={setSelection} />
    </Frame>
  );
};

export const LastTwelveMonths = () => {
  const [selection, setSelection] = useState<any>({ kind: "last12" });
  return (
    <Frame>
      <PeriodSelector anchor={MONTH_ANCHOR} presets={MEMBER_PRESETS} selection={selection} onSelect={setSelection} />
    </Frame>
  );
};

export const CustomRange = () => {
  const [selection, setSelection] = useState<any>({
    kind: "custom",
    from: { year: 2026, month: 7, day: 1 },
    to: { year: 2026, month: 8, day: 15 },
  });
  return (
    <Frame>
      <PeriodSelector anchor={MONTH_ANCHOR} presets={MEMBER_PRESETS} selection={selection} onSelect={setSelection} />
    </Frame>
  );
};

export const PlantLastSevenDays = () => {
  const [selection, setSelection] = useState<any>({ kind: "last7" });
  return (
    <Frame>
      <PeriodSelector anchor={DAY_ANCHOR} presets={PLANT_PRESETS} selection={selection} onSelect={setSelection} />
    </Frame>
  );
};
